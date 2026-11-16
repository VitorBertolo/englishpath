CREATE TABLE IF NOT EXISTS reading_passages (
 id CHAR(36) PRIMARY KEY,
 user_id INT NOT NULL,
 generation_id CHAR(36) NOT NULL,
 title VARCHAR(180) NOT NULL,
 content TEXT NOT NULL,
 theme VARCHAR(180) NOT NULL,
 level VARCHAR(10) NOT NULL DEFAULT 'A1',
 word_count INT NOT NULL,
 model VARCHAR(150) NOT NULL,
 draft_interpretation TEXT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(generation_id) REFERENCES ai_generations(id),
 INDEX(user_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reading_attempts (
 id CHAR(36) PRIMARY KEY,
 user_id INT NOT NULL,
 passage_id CHAR(36) NOT NULL,
 interpretation TEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending',
 feedback JSON NULL,
 generation_id CHAR(36) NULL,
 error_message VARCHAR(1000) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at DATETIME NULL,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(passage_id) REFERENCES reading_passages(id),
 FOREIGN KEY(generation_id) REFERENCES ai_generations(id),
 INDEX(user_id,passage_id,created_at)
) ENGINE=InnoDB;
