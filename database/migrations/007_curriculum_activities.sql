CREATE TABLE IF NOT EXISTS learning_activities (
 id VARCHAR(80) PRIMARY KEY,
 stage_id INT NOT NULL,
 lesson_id INT NULL,
 position INT NOT NULL,
 kind VARCHAR(20) NOT NULL,
 title VARCHAR(180) NOT NULL,
 content JSON NOT NULL,
 FOREIGN KEY(stage_id) REFERENCES stages(id),
 FOREIGN KEY(lesson_id) REFERENCES lessons(id),
 INDEX(stage_id,position)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS activity_drafts (
 user_id INT NOT NULL,
 activity_id VARCHAR(80) NOT NULL,
 response TEXT NOT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,activity_id),
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(activity_id) REFERENCES learning_activities(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS activity_submissions (
 id CHAR(36) PRIMARY KEY,
 user_id INT NOT NULL,
 activity_id VARCHAR(80) NOT NULL,
 response TEXT NOT NULL,
 task_snapshot JSON NOT NULL,
 self_review JSON NOT NULL,
 feedback JSON NULL,
 status VARCHAR(20) NOT NULL,
 generation_id CHAR(36) NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at DATETIME NULL,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(activity_id) REFERENCES learning_activities(id),
 FOREIGN KEY(generation_id) REFERENCES ai_generations(id),
 INDEX(user_id,activity_id,created_at)
) ENGINE=InnoDB;
