import type { MenuItem } from '../types'

const parseTime = (ts: string): number | null => {
    // Try 12-hour format first (e.g. "09:00 AM" from schedule slots)
    const match12 = ts.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
    if (match12) {
        let [, h, m, ampm] = match12
        let hours = parseInt(h, 10)
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0 // Midnight case
        return hours * 60 + parseInt(m || '0', 10)
    }
    
    // Try 24-hour format (e.g. "14:30" from native <input type="time">)
    const match24 = ts.match(/^(\d{1,2}):(\d{2})$/)
    if (match24) {
         let [, h, m] = match24
         return parseInt(h, 10) * 60 + parseInt(m, 10)
    }
    
    return null
}

const isOverlap = (itemStart: number, itemEnd: number, slotStart: number, slotEnd: number): boolean => {
    // Case 1: Neither interval wraps around midnight.
    if (itemStart <= itemEnd && slotStart <= slotEnd) {
        return itemStart <= slotEnd && itemEnd >= slotStart;
    }
    // Case 2: The item interval wraps, the slot interval does not.
    if (itemStart > itemEnd && slotStart <= slotEnd) {
        // Check if slot overlaps with the late part of item (itemStart to midnight) OR the early part of item (midnight to itemEnd)
        return slotStart <= itemEnd || slotEnd >= itemStart;
    }
    // Case 3: The slot interval wraps, the item interval does not.
    if (itemStart <= itemEnd && slotStart > slotEnd) {
        // Check if item overlaps with the late part of slot (slotStart to midnight) OR the early part of slot (midnight to slotEnd)
        return itemStart <= slotEnd || itemEnd >= slotStart;
    }
    // Case 4: Both intervals wrap around midnight. They must overlap.
    if (itemStart > itemEnd && slotStart > slotEnd) {
        return true;
    }
    return false; // Should not be reached
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