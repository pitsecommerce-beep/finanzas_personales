'use client'

import { createContext, useContext } from 'react'
import { useProfile } from '@/lib/hooks/use-profile'
import type { Profile } from '@/types/database'

interface ProfileContextValue {
  profile: Profile | null
  firstName: string | null
  loading: boolean
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  firstName: null,
  loading: true,
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { profile, firstName, loading } = useProfile()

  return (
    <ProfileContext.Provider value={{ profile, firstName, loading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfileContext() {
  return useContext(ProfileContext)
}
