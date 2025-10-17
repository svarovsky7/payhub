import { useEffect, useState } from 'react'
import type { Letter, Contractor } from '../lib/supabase'

/**
 * Custom hook to calculate top 2 popular contractors for a project
 * based on letter history
 */
export const usePopularContractors = (
  selectedProjectId: number | undefined,
  letters: Letter[],
  contractors: Contractor[]
) => {
  const [topSenders, setTopSenders] = useState<Contractor[]>([])
  const [topRecipients, setTopRecipients] = useState<Contractor[]>([])

  useEffect(() => {
    if (!selectedProjectId || !letters.length || !contractors.length) {
      setTopSenders([])
      setTopRecipients([])
      return
    }

    // Filter letters by selected project
    const projectLetters = letters.filter(letter => letter.project_id === selectedProjectId)

    // Count sender contractors
    const senderCounts = new Map<number, number>()
    projectLetters.forEach(letter => {
      if (letter.sender_contractor_id) {
        senderCounts.set(letter.sender_contractor_id, (senderCounts.get(letter.sender_contractor_id) || 0) + 1)
      }
    })

    // Count recipient contractors
    const recipientCounts = new Map<number, number>()
    projectLetters.forEach(letter => {
      if (letter.recipient_contractor_id) {
        recipientCounts.set(letter.recipient_contractor_id, (recipientCounts.get(letter.recipient_contractor_id) || 0) + 1)
      }
    })

    // Get top 2 senders
    const sortedSenders = Array.from(senderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => contractors.find(c => c.id === id))
      .filter(Boolean) as Contractor[]

    // Get top 2 recipients
    const sortedRecipients = Array.from(recipientCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => contractors.find(c => c.id === id))
      .filter(Boolean) as Contractor[]

    setTopSenders(sortedSenders)
    setTopRecipients(sortedRecipients)
  }, [selectedProjectId, letters, contractors])

  return { topSenders, topRecipients }
}
