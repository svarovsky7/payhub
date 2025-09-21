-- Дополнительные изменения схемы БД

-- Таблица связи пользователей с проектами
CREATE TABLE IF NOT EXISTS public.user_projects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_projects_unique UNIQUE (user_id, project_id)
);

-- Создаем индексы для таблицы user_projects
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_project_id ON public.user_projects(project_id);

-- Добавляем несколько тестовых проектов, если их еще нет
INSERT INTO public.projects (code, name, description, is_active) VALUES
  ('PROJ001', 'Проект Альфа', 'Основной проект компании', true),
  ('PROJ002', 'Проект Бета', 'Второстепенный проект', true),
  ('PROJ003', 'Проект Гамма', 'Экспериментальный проект', true)
ON CONFLICT (code) DO NOTHING;