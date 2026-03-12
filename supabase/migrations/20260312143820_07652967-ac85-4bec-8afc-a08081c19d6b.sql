
-- Reset dev-test password to 'Test1234!'
UPDATE auth.users 
SET encrypted_password = crypt('Test1234!', gen_salt('bf'))
WHERE email = 'dev-test@waqfwise.app';
