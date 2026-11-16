ALTER TABLE exercises ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'practice';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS blanks JSON NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS family VARCHAR(80) NULL;
CREATE INDEX IF NOT EXISTS ix_exercise_purpose ON exercises(lesson_id,purpose,active);
CREATE TABLE IF NOT EXISTS exam_sessions (
 id CHAR(36) PRIMARY KEY,
 user_id INT NOT NULL,
 lesson_id INT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'active',
 questions JSON NOT NULL,
 answers JSON NOT NULL,
 grading JSON NULL,
 pass_percent DECIMAL(5,2) NOT NULL,
 score DECIMAL(5,2) NULL,
 passed BOOLEAN NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 completed_at DATETIME NULL,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(lesson_id) REFERENCES lessons(id),
 INDEX(user_id,lesson_id,status)
) ENGINE=InnoDB;
