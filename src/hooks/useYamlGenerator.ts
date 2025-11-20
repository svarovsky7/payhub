import { supabase } from '../lib/supabase'

interface YamlGeneratorOptions {
  letterId: string
  markdown: string
}

export const useYamlGenerator = () => {
  const generateYaml = async ({ letterId, markdown }: YamlGeneratorOptions): Promise<string> => {
    const { data: fullLetter } = await supabase
      .from('letters')
      .select('*')
      .eq('id', letterId)
      .single()

    let projectName = ''
    let creatorName = ''
    let senderName = ''
    let recipientName = ''
    
    if (fullLetter?.project_id) {
      const { data: proj } = await supabase.from('projects').select('name').eq('id', fullLetter.project_id).single()
      projectName = proj?.name || ''
    }
    
    if (fullLetter?.created_by) {
      const { data: creator } = await supabase.from('user_profiles').select('full_name').eq('id', fullLetter.created_by).single()
      creatorName = creator?.full_name || ''
    }
    
    if (fullLetter?.sender_type === 'contractor' && fullLetter?.sender_contractor_id) {
      const { data: sender } = await supabase.from('contractors').select('name').eq('id', fullLetter.sender_contractor_id).single()
      senderName = sender?.name || ''
    }
    
    if (fullLetter?.recipient_type === 'contractor' && fullLetter?.recipient_contractor_id) {
      const { data: recipient } = await supabase.from('contractors').select('name').eq('id', fullLetter.recipient_contractor_id).single()
      recipientName = recipient?.name || ''
    }

    const { data: letterAttachments } = await supabase
      .from('letter_attachments')
      .select('attachment_id')
      .eq('letter_id', letterId)
    
    const { data: parentLinks } = await supabase
      .from('letter_links')
      .select('parent_id')
      .eq('child_id', letterId)
    
    const { data: childLinks } = await supabase
      .from('letter_links')
      .select('child_id')
      .eq('parent_id', letterId)

    let yamlFrontmatter = '---\n'
    
    if (fullLetter) {
      yamlFrontmatter += `id: ${fullLetter.id}\n`
      
      if (fullLetter.number) {
        yamlFrontmatter += `номер_письма_от_контрагента: "${fullLetter.number}"\n`
      }
      
      if (fullLetter.reg_number) {
        yamlFrontmatter += `регистрационный_номер_письма: "${fullLetter.reg_number}"\n`
      }
      
      if (projectName) {
        yamlFrontmatter += `проект: ${projectName}\n`
      }
      
      if (fullLetter.letter_date) {
        yamlFrontmatter += `дата_письма: ${fullLetter.letter_date}\n`
      }
      
      if (fullLetter.subject) {
        yamlFrontmatter += `тема: "${fullLetter.subject}"\n`
      }
      
      yamlFrontmatter += `направление: ${fullLetter.direction === 'incoming' ? 'входящее' : 'исходящее'}\n`
      
      if (fullLetter.reg_date) {
        yamlFrontmatter += `дата_регистрации: ${fullLetter.reg_date}\n`
      }
      
      if (creatorName) {
        yamlFrontmatter += `создал: ${creatorName}\n`
      }
      
      if (fullLetter.created_at) {
        yamlFrontmatter += `создано: ${fullLetter.created_at}\n`
      }
      
      if (fullLetter.delivery_method) {
        yamlFrontmatter += `метод_доставки: "${fullLetter.delivery_method}"\n`
      }
      
      if (fullLetter.responsible_person_name) {
        yamlFrontmatter += `ответственный: ${fullLetter.responsible_person_name}\n`
      }
      
      if (senderName) {
        yamlFrontmatter += `отправитель: ${senderName}\n`
      } else if (fullLetter.sender) {
        yamlFrontmatter += `отправитель: "${fullLetter.sender}"\n`
      }
      
      if (recipientName) {
        yamlFrontmatter += `получатель: ${recipientName}\n`
      } else if (fullLetter.recipient) {
        yamlFrontmatter += `получатель: "${fullLetter.recipient}"\n`
      }
      
      if (letterAttachments && letterAttachments.length > 0) {
        const attachmentIds = letterAttachments.map(la => la.attachment_id)
        const { data: attachments } = await supabase
          .from('attachments')
          .select('original_name, mime_type')
          .in('id', attachmentIds)
        
        if (attachments && attachments.length > 0) {
          const filteredAttachments = attachments.filter(att => 
            !att.mime_type?.includes('markdown') && !att.original_name.endsWith('.md')
          )
          
          if (filteredAttachments.length > 0) {
            yamlFrontmatter += `вложения:\n`
            filteredAttachments.forEach(att => {
              yamlFrontmatter += `  - "${att.original_name}"\n`
            })
          }
        }
      }
      
      if (parentLinks && parentLinks.length > 0) {
        yamlFrontmatter += `родительские_письма:\n`
        parentLinks.forEach(link => {
          yamlFrontmatter += `  - ${link.parent_id}\n`
        })
      }
      
      if (childLinks && childLinks.length > 0) {
        yamlFrontmatter += `дочерние_письма:\n`
        childLinks.forEach(link => {
          yamlFrontmatter += `  - ${link.child_id}\n`
        })
      }
    }
    
    yamlFrontmatter += '---\n\n'

    const hasYamlFrontmatter = markdown.startsWith('---\n')
    
    let markdownWithMetadata: string
    if (hasYamlFrontmatter) {
      const endIndex = markdown.indexOf('\n---\n', 4)
      if (endIndex !== -1) {
        markdownWithMetadata = yamlFrontmatter + markdown.substring(endIndex + 5)
      } else {
        markdownWithMetadata = yamlFrontmatter + markdown
      }
    } else {
      markdownWithMetadata = yamlFrontmatter + markdown
    }

    return markdownWithMetadata
  }

  return { generateYaml }
}

