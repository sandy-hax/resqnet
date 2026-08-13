import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '../components/Header'
import { getMyTeam } from '../api/client'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Badge() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['team', 'me'],
    queryFn: getMyTeam,
  })

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="p-4">
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl border border-border shadow-card">
          <h2 className="text-xl font-semibold mb-2">Official Team Credential</h2>

          {isLoading && <div className="text-sm text-muted py-4">Loading profile…</div>}
          {error && (
            <div className="text-sm text-danger bg-danger/5 border border-danger/30 rounded-lg px-4 py-3">
              Could not load team profile.
            </div>
          )}

          {profile && (
            <>
              <div className="text-sm text-muted">Unit</div>
              <div className="font-medium text-lg">{profile.team_name}</div>
              <div className="mt-2 text-sm">
                Badge: <strong className="font-mono">{profile.badge_number}</strong>
              </div>
              <div className="mt-1 text-sm">Experience: {profile.experience_level}</div>
              <div className="mt-1 text-sm">
                Status:{' '}
                <span className={profile.is_available ? 'text-success font-semibold' : 'text-warning font-semibold'}>
                  {profile.is_available ? 'On Duty' : 'Not Available'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.specialization.map((s: string) => (
                  <span key={s} className="px-2 py-1 bg-primaryLight text-primary border border-primary/20 rounded-lg text-sm font-medium">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted">
                Contact: {profile.contact_phone ?? '—'}
                {profile.current_lat != null && (
                  <>
                    <br />
                    Live: <code>{profile.current_lat.toFixed(5)}, {profile.current_lng?.toFixed(5)}</code>
                    {profile.location_updated_at && (
                      <>
                        {' '}
                        <span className="text-success">· synced {timeAgo(profile.location_updated_at)}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
