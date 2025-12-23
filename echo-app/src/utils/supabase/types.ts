export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            families: {
                Row: {
                    id: string
                    name: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string | null
                    created_at?: string
                }
            }
            glows: {
                Row: {
                    id: string
                    created_at: string
                    family_id: string
                    sender_id: string
                    message: string
                    is_read: boolean
                    is_saved: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string
                    family_id: string
                    sender_id: string
                    message: string
                    is_read?: boolean
                    is_saved?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    family_id?: string
                    sender_id?: string
                    message?: string
                    is_read?: boolean
                    is_saved?: boolean
                }
            }
            scheduled_talks: {
                Row: {
                    id: string
                    created_at: string
                    family_id: string
                    initiator_id: string
                    theme: string
                    scheduled_at: string
                    status: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    family_id: string
                    initiator_id: string
                    theme: string
                    scheduled_at: string
                    status?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    family_id?: string
                    initiator_id?: string
                    theme?: string
                    scheduled_at?: string
                    status?: string | null
                }
            }
            profiles: {
                Row: {
                    id: string
                    family_id: string | null
                    display_name: string | null
                    avatar_url: string | null
                    current_vibe: string | null
                }
                Insert: {
                    id: string
                    family_id?: string | null
                    display_name?: string | null
                    avatar_url?: string | null
                    current_vibe?: string | null
                }
                Update: {
                    id?: string
                    family_id?: string | null
                    display_name?: string | null
                    avatar_url?: string | null
                    current_vibe?: string | null
                }
            }
        }
    }
}
