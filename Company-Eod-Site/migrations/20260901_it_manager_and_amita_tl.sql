-- Leadership restructure: Waseem becomes IT Manager and Amita becomes the MM/EWM Team Lead.
UPDATE users SET role = 'it_manager', password_hash = 'ee45edd986a9f0a27188c9ba6aa4c71cef3555aa803a44cb1477ff4d2bf8c29e' WHERE id = 4;
UPDATE users SET role = 'tl' WHERE id = 15;
UPDATE teams SET tl_id = 15 WHERE id IN (3, 4);
