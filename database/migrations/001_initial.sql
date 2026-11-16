CREATE TABLE IF NOT EXISTS users (
 id INT PRIMARY KEY AUTO_INCREMENT, username VARCHAR(80) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id), INDEX(expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS stages (
 id INT PRIMARY KEY, title VARCHAR(180) NOT NULL, description TEXT NOT NULL, available BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS modules (
 id INT PRIMARY KEY, stage_id INT NOT NULL, title VARCHAR(180) NOT NULL, FOREIGN KEY(stage_id) REFERENCES stages(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS lessons (
 id INT PRIMARY KEY, module_id INT NOT NULL, position INT NOT NULL, title VARCHAR(180) NOT NULL, objective TEXT NOT NULL, explanation TEXT NOT NULL, examples JSON NOT NULL, FOREIGN KEY(module_id) REFERENCES modules(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS skills (
 id INT PRIMARY KEY, lesson_id INT NOT NULL, title VARCHAR(180) NOT NULL, FOREIGN KEY(lesson_id) REFERENCES lessons(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS exercises (
 id VARCHAR(80) PRIMARY KEY, lesson_id INT NOT NULL, skill_id INT NOT NULL,
 type VARCHAR(30) NOT NULL, prompt TEXT NOT NULL, instruction TEXT NOT NULL, passage TEXT NULL,
 options JSON NULL, words JSON NULL, accepted_answers JSON NOT NULL, explanation TEXT NOT NULL,
 difficulty INT NOT NULL DEFAULT 1, source VARCHAR(20) NOT NULL DEFAULT 'seed', model VARCHAR(150) NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(lesson_id) REFERENCES lessons(id), FOREIGN KEY(skill_id) REFERENCES skills(id), INDEX(lesson_id,active)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS study_sessions (
 id CHAR(36) PRIMARY KEY, user_id INT NOT NULL, lesson_id INT NOT NULL, mode VARCHAR(15) NOT NULL,
 exercise_ids JSON NOT NULL, position_index INT NOT NULL DEFAULT 0, status VARCHAR(15) NOT NULL DEFAULT 'active',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at DATETIME NULL,
 FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(lesson_id) REFERENCES lessons(id), INDEX(user_id,status)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS exercise_attempts (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, user_id INT NOT NULL, exercise_id VARCHAR(80) NOT NULL, session_id CHAR(36) NOT NULL, skill_id INT NOT NULL,
 answer TEXT NOT NULL, result VARCHAR(20) NOT NULL, method VARCHAR(30) NOT NULL, feedback JSON NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(exercise_id) REFERENCES exercises(id), FOREIGN KEY(session_id) REFERENCES study_sessions(id), FOREIGN KEY(skill_id) REFERENCES skills(id),
 UNIQUE(session_id,exercise_id), INDEX(user_id,created_at), INDEX(user_id,skill_id,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS exercise_reviews (
 user_id INT NOT NULL, exercise_id VARCHAR(80) NOT NULL, streak INT NOT NULL DEFAULT 0, next_review DATETIME NOT NULL, last_result VARCHAR(20) NOT NULL,
 PRIMARY KEY(user_id,exercise_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(exercise_id) REFERENCES exercises(id), INDEX(user_id,next_review)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS skill_progress (
 user_id INT NOT NULL, skill_id INT NOT NULL, attempts INT NOT NULL DEFAULT 0, correct INT NOT NULL DEFAULT 0, accuracy DECIMAL(5,4) NOT NULL DEFAULT 0, mastery VARCHAR(20) NOT NULL DEFAULT 'new', last_practice DATETIME NOT NULL,
 PRIMARY KEY(user_id,skill_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(skill_id) REFERENCES skills(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS vocabulary (
 id INT PRIMARY KEY, stage_id INT NOT NULL, word VARCHAR(80) NOT NULL, translation VARCHAR(120) NOT NULL, example TEXT NOT NULL, FOREIGN KEY(stage_id) REFERENCES stages(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ai_generations (
 id CHAR(36) PRIMARY KEY, user_id INT NOT NULL, kind VARCHAR(30) NOT NULL, model VARCHAR(150) NOT NULL, payload JSON NULL, status VARCHAR(20) NOT NULL, usage_data JSON NULL, cost DECIMAL(14,8) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;
