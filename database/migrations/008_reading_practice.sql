ALTER TABLE reading_passages
 ADD COLUMN IF NOT EXISTS questions JSON NULL,
 ADD COLUMN IF NOT EXISTS text_type VARCHAR(20) NOT NULL DEFAULT 'story',
 ADD COLUMN IF NOT EXISTS difficulty TINYINT NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS draft_answers JSON NULL;

ALTER TABLE reading_attempts
 ADD COLUMN IF NOT EXISTS answers JSON NULL,
 MODIFY COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 MODIFY COLUMN reviewed_at DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS reading_vocabulary (
 id CHAR(36) PRIMARY KEY,
 user_id INT NOT NULL,
 passage_id CHAR(36) NOT NULL,
 term VARCHAR(120) NOT NULL,
 normalized_term VARCHAR(120) NOT NULL,
 meaning_pt_br VARCHAR(500) NOT NULL,
 context_en TEXT NOT NULL,
 streak INT NOT NULL DEFAULT 0,
 review_version INT NOT NULL DEFAULT 0,
 next_review_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_reviewed_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(passage_id) REFERENCES reading_passages(id),
 UNIQUE KEY reading_vocabulary_term(user_id,normalized_term),
 INDEX(user_id,next_review_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reading_vocabulary_reviews (
 id CHAR(36) PRIMARY KEY,
 vocabulary_id CHAR(36) NOT NULL,
 user_id INT NOT NULL,
 answer VARCHAR(1000) NOT NULL,
 remembered BOOLEAN NOT NULL,
 review_version INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(vocabulary_id) REFERENCES reading_vocabulary(id),
 FOREIGN KEY(user_id) REFERENCES users(id),
 UNIQUE KEY reading_vocabulary_version(vocabulary_id,review_version)
) ENGINE=InnoDB;
