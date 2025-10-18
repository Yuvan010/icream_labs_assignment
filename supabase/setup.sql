-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);

-- Keywords policies
CREATE POLICY "Users can view keywords for own projects"
  ON keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create keywords for own projects"
  ON keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update keywords for own projects"
  ON keywords FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keywords for own projects"
  ON keywords FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = keywords.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Checks policies
CREATE POLICY "Users can view checks for own projects"
  ON checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = checks.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checks for own projects"
  ON checks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = checks.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Engines table is public read-only (no RLS needed as it's reference data)
CREATE POLICY "Anyone can read engines"
  ON engines FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checks_project_id ON checks(project_id);
CREATE INDEX IF NOT EXISTS idx_checks_keyword_id ON checks(keyword_id);
CREATE INDEX IF NOT EXISTS idx_checks_engine_id ON checks(engine_id);
CREATE INDEX IF NOT EXISTS idx_checks_timestamp ON checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_keywords_project_id ON keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);