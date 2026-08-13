import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { updateAvailability, getMyTeam } from '../api/client'
import useGeolocation from '../hooks/useGeolocation'

export default function AvailabilityToggle() {
  const queryClient = useQueryClient()
  const { position } = useGeolocation()

  const { data: team } = useQuery({ queryKey: ['team', 'me'], queryFn: getMyTeam })
  const available = team?.is_available ?? false

  async function toggle() {
    const next = !available
    try {
      await updateAvailability({
        is_available: next,
        current_lat: position?.coords.latitude ?? team?.current_lat ?? undefined,
        current_lng: position?.coords.longitude ?? team?.current_lng ?? undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['team', 'me'] })
    } catch (e) {
      console.error('availability update failed', e)
    }
  }

  return (
    <button
      onClick={toggle}
      className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
        available ? 'bg-success text-white' : 'bg-surface border border-border text-muted hover:text-text'
      }`}
    >
      {available ? 'On Duty' : 'Mark Available'}
    </button>
  )
}
