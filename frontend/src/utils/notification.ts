import hotToast from 'react-hot-toast'

const playNotificationSound = () => {
  if (typeof window === 'undefined') return

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 520
    gainNode.gain.value = 0.1

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)

    oscillator.start()
    oscillator.stop(context.currentTime + 0.12)

    oscillator.onended = () => {
      context.close().catch(() => {})
    }
  } catch {
    // Ignore browsers that block auto-play or do not support Web Audio
  }
}

const toast = ((...args: Parameters<typeof hotToast>) => {
  playNotificationSound()
  return hotToast(...args)
}) as typeof hotToast

const wrapWithSound = <T extends (...args: any[]) => any>(fn: T): T =>
  ((...args: Parameters<T>) => {
    playNotificationSound()
    return fn(...args)
  }) as T

toast.error = wrapWithSound(hotToast.error)
toast.success = wrapWithSound(hotToast.success)
toast.loading = wrapWithSound(hotToast.loading)
toast.custom = wrapWithSound(hotToast.custom)
toast.promise = ((promise: Promise<unknown>, messages: any, options?: any) => {
  playNotificationSound()
  return hotToast.promise(promise, messages, options)
}) as typeof hotToast.promise

toast.dismiss = hotToast.dismiss
toast.remove = hotToast.remove
toast.dismissAll = hotToast.dismissAll || hotToast.dismiss

export default toast
