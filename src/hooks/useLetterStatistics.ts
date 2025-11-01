import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface LetterStats {
  totalLetters: number
  lettersByDirection: Array<{ direction: string; count: number }>
  lettersByProject: Array<{ name: string; count: number }>
  lettersByResponsible: Array<{ name: string; count: number }>
  topSenders: Array<{ name: string; count: number }>
  topRecipients: Array<{ name: string; count: number }>
  lettersByStatus: Array<{ name: string; color: string; count: number }>
  lettersByCreator: Array<{ name: string; incoming: number; outgoing: number; total: number }>
}

interface LetterRow {
  id: string
  direction: string
  sender: string | null
  recipient: string | null
  responsible_person_name: string | null
  sender_contractor_id: number | null
  recipient_contractor_id: number | null
  created_by: string | null
  responsible_user_id?: string | null
  responsible_user?: { full_name: string } | null
  project_id?: string | null
  project?: { name: string } | null
  status_id?: number | null
  status?: { name: string; color: string } | null
}

export const useLetterStatistics = (selectedProjectName?: string) => {
  const [stats, setStats] = useState<LetterStats>({
    totalLetters: 0,
    lettersByDirection: [],
    lettersByProject: [],
    lettersByResponsible: [],
    topSenders: [],
    topRecipients: [],
    lettersByStatus: [],
    lettersByCreator: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        // Fetch all letters with related data
        const { data: letters, error: lettersError } = await supabase
          .from('letters')
          .select(`
            id,
            direction,
            sender,
            recipient,
            responsible_person_name,
            sender_contractor_id,
            recipient_contractor_id,
            created_by,
            responsible_user: user_profiles!letters_responsible_user_id_fkey(full_name),
            project: projects(name),
            status: letter_statuses(name, color)
          `)

        if (lettersError) throw lettersError

        const lettersList = (letters as unknown as LetterRow[]) || []

        // Get unique contractor IDs and user IDs from the fetched letters
        const contractorIds = new Set<number>()
        const userIds = new Set<string>()
        lettersList.forEach(letter => {
          if (letter.sender_contractor_id) contractorIds.add(letter.sender_contractor_id)
          if (letter.recipient_contractor_id) contractorIds.add(letter.recipient_contractor_id)
          if (letter.created_by) userIds.add(letter.created_by)
        })

        // Fetch contractor names
        const contractorMap = new Map<number, string>()
        if (contractorIds.size > 0) {
          const { data: contractors, error: contractorsError } = await supabase
            .from('contractors')
            .select('id, name')
            .in('id', Array.from(contractorIds))

          if (!contractorsError && contractors) {
            contractors.forEach(contractor => {
              contractorMap.set(contractor.id, contractor.name)
            })
          }
        }

        // Fetch user names for creators
        const userMap = new Map<string, string>()
        if (userIds.size > 0) {
          const { data: users, error: usersError } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', Array.from(userIds))

          if (!usersError && users) {
            users.forEach(user => {
              userMap.set(user.id, user.full_name || user.id)
            })
          }
        }

        // Total letters
        const totalLetters = lettersList.length

        // By direction
        const directionMap = new Map<string, number>()
        lettersList.forEach(letter => {
          const dir = letter.direction === 'incoming' ? 'Входящие' : 'Исходящие'
          directionMap.set(dir, (directionMap.get(dir) || 0) + 1)
        })
        const lettersByDirection = Array.from(directionMap.entries()).map(([direction, count]) => ({
          direction,
          count,
        }))

        // By project
        const projectMap = new Map<string, number>()
        lettersList.forEach(letter => {
          if (letter.project?.name) {
            projectMap.set(letter.project.name, (projectMap.get(letter.project.name) || 0) + 1)
          } else {
            // Письма без проекта
            projectMap.set('Без проекта', (projectMap.get('Без проекта') || 0) + 1)
          }
        })
        const lettersByProject = Array.from(projectMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        // By responsible person
        const responsibleMap = new Map<string, number>()
        lettersList.forEach(letter => {
          let responsible = letter.responsible_person_name || letter.responsible_user?.full_name

          // Если нет явного ответственного, используем контрагента в зависимости от направления
          if (!responsible) {
            if (letter.direction === 'incoming' && letter.recipient) {
              responsible = letter.recipient
            } else if (letter.direction === 'outgoing' && letter.sender) {
              responsible = letter.sender
            } else if (letter.direction === 'incoming' && letter.recipient_contractor_id) {
              responsible = contractorMap.has(letter.recipient_contractor_id) ?
                           contractorMap.get(letter.recipient_contractor_id)! :
                           `Контрагент ${letter.recipient_contractor_id}`
            } else if (letter.direction === 'outgoing' && letter.sender_contractor_id) {
              responsible = contractorMap.has(letter.sender_contractor_id) ?
                           contractorMap.get(letter.sender_contractor_id)! :
                           `Контрагент ${letter.sender_contractor_id}`
            }
          }

          responsibleMap.set(responsible || 'Не назначен', (responsibleMap.get(responsible || 'Не назначен') || 0) + 1)
        })
        const lettersByResponsible = Array.from(responsibleMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        // Top senders (filtered by project if selected)
        const filteredLetters = selectedProjectName
          ? lettersList.filter(letter => {
              if (selectedProjectName === 'Без проекта') {
                return !letter.project?.name
              }
              return letter.project?.name === selectedProjectName
            })
          : lettersList

        const senderMap = new Map<string, number>()
        filteredLetters.forEach(letter => {
          const sender = letter.sender ||
                        (letter.sender_contractor_id && contractorMap.has(letter.sender_contractor_id) ?
                         contractorMap.get(letter.sender_contractor_id)! :
                         (letter.sender_contractor_id ? `Контрагент ${letter.sender_contractor_id}` : null)) ||
                        'Неизвестный'
          senderMap.set(sender, (senderMap.get(sender) || 0) + 1)
        })
        const topSenders = Array.from(senderMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Top recipients (filtered by project if selected)
        const recipientMap = new Map<string, number>()
        filteredLetters.forEach(letter => {
          const recipient = letter.recipient ||
                           (letter.recipient_contractor_id && contractorMap.has(letter.recipient_contractor_id) ?
                            contractorMap.get(letter.recipient_contractor_id)! :
                            (letter.recipient_contractor_id ? `Контрагент ${letter.recipient_contractor_id}` : null)) ||
                           'Неизвестный'
          recipientMap.set(recipient, (recipientMap.get(recipient) || 0) + 1)
        })
        const topRecipients = Array.from(recipientMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // By status
        const statusMap = new Map<string, { count: number; color: string }>()
        lettersList.forEach(letter => {
          const statusName = letter.status?.name || 'Без статуса'
          const statusColor = letter.status?.color || 'default'
          const current = statusMap.get(statusName) || { count: 0, color: statusColor }
          statusMap.set(statusName, { count: current.count + 1, color: statusColor })
        })
        const lettersByStatus = Array.from(statusMap.entries()).map(([name, { count, color }]) => ({
          name,
          count,
          color,
        }))

        // By creator (incoming/outgoing)
        const creatorMap = new Map<string, { incoming: number; outgoing: number; name: string }>()
        lettersList.forEach(letter => {
          const creatorId = letter.created_by
          if (!creatorId) return

          const creatorName = userMap.get(creatorId) || creatorId
          const current = creatorMap.get(creatorId) || { incoming: 0, outgoing: 0, name: creatorName }

          if (letter.direction === 'incoming') {
            current.incoming++
          } else if (letter.direction === 'outgoing') {
            current.outgoing++
          }

          creatorMap.set(creatorId, current)
        })
        const lettersByCreator = Array.from(creatorMap.values())
          .map(({ name, incoming, outgoing }) => ({
            name,
            incoming,
            outgoing,
            total: incoming + outgoing
          }))
          .sort((a, b) => b.total - a.total)

        setStats({
          totalLetters,
          lettersByDirection,
          lettersByProject,
          lettersByResponsible,
          topSenders,
          topRecipients,
          lettersByStatus,
          lettersByCreator,
        })
      } catch (error) {
        console.error('[useLetterStatistics] Error loading statistics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStatistics()
  }, [selectedProjectName]) // Add selectedProjectName to dependencies

  return { stats, loading }
}
