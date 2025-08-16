-- Update function to handle invoice rejection and budget adjustments
-- This replaces the existing update_project_budget_on_approval function

CREATE OR REPLACE FUNCTION public.update_project_budget_on_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Handle invoice approval (increase spent amount)
    IF NEW.status = 'supply_review' AND OLD.status = 'director_review' THEN
        -- Update the spent amount for the project
        UPDATE public.project_budgets
        SET 
            spent_amount = spent_amount + NEW.total_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE project_id = NEW.project_id;
        
        -- Insert history record
        INSERT INTO public.budget_history (
            project_budget_id,
            action_type,
            amount,
            old_spent,
            new_spent,
            description,
            created_by
        )
        SELECT 
            pb.id,
            'spent',
            NEW.total_amount,
            pb.spent_amount - NEW.total_amount,
            pb.spent_amount,
            'Invoice #' || NEW.invoice_number || ' approved by director',
            NEW.created_by
        FROM public.project_budgets pb
        WHERE pb.project_id = NEW.project_id;
    END IF;
    
    -- Handle invoice rejection (decrease spent amount if it was previously approved)
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        -- Only decrease spent amount if the invoice was previously in supply_review or later stages
        -- (meaning it was already counted in spent_amount)
        IF OLD.status IN ('supply_review', 'payment_processing', 'paid') THEN
            -- Update the spent amount for the project (decrease)
            UPDATE public.project_budgets
            SET 
                spent_amount = GREATEST(spent_amount - NEW.total_amount, 0), -- Ensure it doesn't go below 0
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = NEW.project_id;
            
            -- Insert history record
            INSERT INTO public.budget_history (
                project_budget_id,
                action_type,
                amount,
                old_spent,
                new_spent,
                description,
                created_by
            )
            SELECT 
                pb.id,
                'adjustment',
                -NEW.total_amount, -- Negative amount to indicate decrease
                pb.spent_amount + NEW.total_amount, -- Old value before adjustment
                pb.spent_amount, -- New value after adjustment
                'Invoice #' || NEW.invoice_number || ' rejected - amount refunded to budget',
                NEW.created_by
            FROM public.project_budgets pb
            WHERE pb.project_id = NEW.project_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Update the budget_summary view to correctly calculate remaining_amount
CREATE OR REPLACE VIEW public.budget_summary AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.address AS project_address,
    COALESCE(pb.allocated_amount, 0::numeric) AS allocated_amount,
    COALESCE(pb.spent_amount, 0::numeric) AS spent_amount,
    COALESCE(pb.allocated_amount - pb.spent_amount, 0::numeric) AS remaining_amount,
    pb.created_at AS budget_created_at,
    pb.updated_at AS budget_updated_at,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'director_review') AS pending_approvals,
    SUM(i.total_amount) FILTER (WHERE i.status = 'director_review') AS pending_amount
FROM projects p
LEFT JOIN project_budgets pb ON p.id = pb.project_id
LEFT JOIN invoices i ON p.id = i.project_id
GROUP BY 
    p.id, 
    p.name, 
    p.address, 
    pb.allocated_amount, 
    pb.spent_amount, 
    pb.created_at, 
    pb.updated_at
ORDER BY p.name;