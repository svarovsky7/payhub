-- Таблица заданий на обработку документов
CREATE TABLE IF NOT EXISTS public.document_tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title character varying(255) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_tasks_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.document_tasks IS 'Задания на обработку документов';

-- Связь заданий с файлами
CREATE TABLE IF NOT EXISTS public.document_task_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT document_task_attachments_pkey PRIMARY KEY (id),
    CONSTRAINT document_task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.document_tasks(id) ON DELETE CASCADE,
    CONSTRAINT document_task_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_document_tasks_created_by ON public.document_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_document_task_attachments_task_id ON public.document_task_attachments(task_id);
