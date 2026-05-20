import type { MenuItem } from '../types'

const parseTime = (ts: string): number | null => {
    const match = ts.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
    if (!match) return null
    let [, h, m, ampm] = match
    let hours = parseInt(h, 10)
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0 // Midnight case
    return hours * 60 + parseInt(m || '0', 10)
}

const isOverlap = (itemStart: number, itemEnd: number, slotStart: number, slotEnd: number): boolean => {
    // This handles simple, non-overnight time ranges
    return itemStart <= slotEnd && itemEnd >= slotStart
}

export const autoAssignItemToSlots = (
    item: MenuItem,
    timeInput: string,
    currentSlots: any[]
): { newSlots: any[]; assignedSlotNames: string[]; hasChanges: boolean } => {
    let times = timeInput.split('-').map(s => s.trim())
    if (times.length !== 2) {
        times = timeInput.toLowerCase().split('to').map(s => s.trim())
    }

    if (times.length !== 2) {
        return { newSlots: currentSlots, assignedSlotNames: [], hasChanges: false }
    }

    const itemStart = parseTime(times[0])
    const itemEnd = parseTime(times[1])

    if (itemStart === null || itemEnd === null) {
        return { newSlots: currentSlots, assignedSlotNames: [], hasChanges: false }
    }

    const assignedSlotNames: string[] = []
    let hasChanges = false

    const newSlots = currentSlots.map(slot => {
        if (!slot.time || slot.time.toLowerCase().includes('all day')) {
            return slot
        }

        const slotTimes = slot.time.split('-').map((s: string) => s.trim())
        if (slotTimes.length !== 2) return slot

        const slotStart = parseTime(slotTimes[0])
        const slotEnd = parseTime(slotTimes[1])

        if (slotStart !== null && slotEnd !== null) {
            const hasItem = slot.items.find((i: MenuItem) => i.id === item.id)
            if (isOverlap(itemStart, itemEnd, slotStart, slotEnd)) {
                assignedSlotNames.push(slot.name)
                if (!hasItem) {
                    hasChanges = true
                    return { ...slot, items: [...slot.items, item] }
                }
            }
        }
        return slot
    })

    return { newSlots, assignedSlotNames, hasChanges }
}