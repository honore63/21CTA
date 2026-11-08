-- Add custom subject support
ALTER TABLE subjects 
ADD COLUMN is_custom BOOLEAN DEFAULT FALSE,
ADD COLUMN created_by INT NULL,
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
