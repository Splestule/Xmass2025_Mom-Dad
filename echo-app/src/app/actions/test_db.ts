
import { createClient } from '@/utils/supabase/server'

export async function testStatusEnum() {
    const supabase = await createClient()
    const { error } = await (supabase.from('checkins') as any)
        .update({ status: 'timer_complete_test' })
        .eq('id', 'non-existent-id')

    if (error && error.message.includes('invalid input value for enum')) {
        return { isEnum: true, error: error.message }
    }
    return { isEnum: false, error: error?.message }
}
