

## تحليل المشكلة

الملف `.github/workflows/auto-version.yml` يحتوي على عدة مشاكل تسبب فشله المتكرر:

### 1. مشكلة JSON مع النصوص العربية (السبب الرئيسي)
- في خطوة "Collect commits" يتم بناء JSON يدوياً باستخدام `for` loops مع `tr '|' '\n'`
- رسائل الـ commits التي تحتوي مسافات أو أحرف خاصة أو نصوص عربية تتكسر عند `tr` و word-splitting
- مثال: `"تحسين واجهة المستخدم"` تصبح 3 كلمات منفصلة في `for` loop
- النتيجة: JSON غير صالح → خطوة "Update changelog.json" تفشل بـ `JSON.parse` error

### 2. مشكلة الـ push conflict مع Lovable
- Lovable يدفع تغييرات للـ repo باستمرار
- عندما يحاول الـ Action عمل `git push`، قد يفشل لأن الـ remote تغيّر (non-fast-forward)

### 3. مشكلة `paths-ignore`
- الملف يتجاهل تغييرات `.github/workflows/**` لكن لا يتجاهل `package.json`
- هذا قد يسبب حلقات لا نهائية في بعض الحالات

---

## خطة الإصلاح

### تعديل ملف `.github/workflows/auto-version.yml`:

**أ) إعادة كتابة خطوة "Collect commits" بـ Node.js بدلاً من Bash:**
- استخدام `node` script لتصنيف الـ commits وبناء JSON بشكل آمن
- يحل مشكلة الأحرف العربية والمسافات والأحرف الخاصة بالكامل

**ب) إضافة `git pull --rebase` قبل `git push`:**
- يحل مشكلة الـ conflict مع تغييرات Lovable المتزامنة
- إضافة retry logic في حالة فشل الـ push

**ج) إضافة `package.json` لقائمة `paths-ignore`:**
- منع الحلقات اللا نهائية

### الملف المعدّل (الأجزاء المتغيرة):

```yaml
paths-ignore:
  - 'public/changelog.json'
  - 'docs/CHANGELOG.md'
  - '.github/workflows/**'
  - 'package.json'          # ← جديد: منع الحلقات
```

خطوة "Collect commits" الجديدة:
```yaml
- name: Collect commits since last tag
  id: commits
  run: |
    LAST_TAG=$(git tag -l 'v*' --sort=-version:refname | head -1 || echo "")
    if [ -z "$LAST_TAG" ]; then
      git log --oneline --no-merges -20 --pretty="%s" > /tmp/commits.txt
    else
      git log "$LAST_TAG"..HEAD --oneline --no-merges --pretty="%s" > /tmp/commits.txt
    fi

    node -e "
      const fs = require('fs');
      const lines = fs.readFileSync('/tmp/commits.txt','utf8').split('\n').filter(Boolean);
      const changes = [];
      for (const msg of lines) {
        if (/\[skip ci\]/i.test(msg) || /^docs:/i.test(msg)) continue;
        const clean = msg.replace(/^(feat|fix|improvement|chore|refactor|perf|style):\s*/i, '');
        const type = /^feat:/i.test(msg) ? 'feature' : /^fix:/i.test(msg) ? 'fix' : 'improvement';
        changes.push({ type, text: clean });
      }
      if (!changes.length) changes.push({ type: 'improvement', text: 'تحسينات وإصلاحات متنوعة' });
      fs.writeFileSync('/tmp/changes.json', JSON.stringify(changes));
    "
    echo "json=$(cat /tmp/changes.json)" >> "$GITHUB_OUTPUT"
```

خطوة "Update changelog.json" تبقى كما هي لكن تقرأ من ملف بدل متغير:
```yaml
- name: Update changelog.json
  run: |
    node -e "
      const fs = require('fs');
      const changelog = JSON.parse(fs.readFileSync('public/changelog.json', 'utf8'));
      const changes = JSON.parse(fs.readFileSync('/tmp/changes.json', 'utf8'));
      changelog.unshift({
        version: '${{ steps.bump.outputs.version }}',
        date: '${{ steps.date.outputs.arabic }}',
        changes
      });
      fs.writeFileSync('public/changelog.json', JSON.stringify(changelog, null, 2) + '\n');
    "
```

خطوة "Commit and push" الجديدة مع retry:
```yaml
- name: Commit and push
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add package.json public/changelog.json
    git diff --cached --quiet && echo "No changes" && exit 0
    git commit -m "chore: bump version to v${{ steps.bump.outputs.version }} [skip ci]"
    git tag "v${{ steps.bump.outputs.version }}"
    for i in 1 2 3; do
      git pull --rebase origin main && git push && git push --tags && exit 0
      echo "Retry $i..."
      sleep 5
    done
    echo "Push failed after 3 retries"
    exit 1
```

### ملخص التغييرات
| المشكلة | الحل |
|---------|------|
| JSON يتكسر مع النصوص العربية | بناء JSON بـ Node.js بدل Bash |
| Push conflict مع Lovable | `git pull --rebase` + retry 3 مرات |
| حلقة لا نهائية محتملة | إضافة `package.json` لـ paths-ignore |

