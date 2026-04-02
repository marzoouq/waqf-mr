import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NoPublishedYearsNotice from './NoPublishedYearsNotice';

describe('NoPublishedYearsNotice', () => {
  it('يعرض رسالة عدم وجود سنوات منشورة', () => {
    render(<NoPublishedYearsNotice />);
    expect(screen.getByText('لا توجد سنوات مالية منشورة')).toBeInTheDocument();
    expect(screen.getByText(/لم ينشر الناظر/)).toBeInTheDocument();
  });
});
