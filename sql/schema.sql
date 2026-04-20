DROP TABLE IF EXISTS sample_cell_count;
DROP TABLE IF EXISTS cell_type;
DROP TABLE IF EXISTS sample;
DROP TABLE IF EXISTS subject;
DROP TABLE IF EXISTS project;


CREATE TABLE project (
    project_id TEXT PRIMARY KEY
);


CREATE TABLE subject (
    subject_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    condition TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0),
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
    treatment TEXT NOT NULL,
    response TEXT CHECK (response IN ('yes', 'no') OR response IS NULL),
    sample_type TEXT NOT NULL,

    FOREIGN KEY (project_id) REFERENCES project(project_id)
);
CREATE INDEX idx_subject_project_id
    ON subject(project_id);


CREATE TABLE sample (
    sample_id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    time_from_treatment_start INTEGER NOT NULL,

    FOREIGN KEY (subject_id) REFERENCES subject(subject_id)
);
CREATE INDEX idx_sample_subject_id
    ON sample(subject_id);


CREATE TABLE cell_type (
    cell_type_id INTEGER PRIMARY KEY,
    cell_type_name TEXT NOT NULL UNIQUE
);
INSERT OR IGNORE INTO cell_type (cell_type_name) VALUES
    ('b_cell'), ('cd8_t_cell'), ('cd4_t_cell'), ('nk_cell'), ('monocyte');


CREATE TABLE sample_cell_count (
    sample_id TEXT NOT NULL,
    cell_type_id INTEGER NOT NULL,
    cell_count INTEGER NOT NULL CHECK (cell_count >= 0),

    PRIMARY KEY (sample_id, cell_type_id),

    FOREIGN KEY (sample_id) REFERENCES sample(sample_id),
    FOREIGN KEY (cell_type_id) REFERENCES cell_type(cell_type_id)
);
CREATE INDEX idx_sample_cell_count_sample_id
    ON sample_cell_count(sample_id);
CREATE INDEX idx_sample_cell_count_cell_type_id
    ON sample_cell_count(cell_type_id);