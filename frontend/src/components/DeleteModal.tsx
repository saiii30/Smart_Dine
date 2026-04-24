import { X } from 'lucide-react'

type Props = {
  title?: string
  message?: string
  onConfirm: () => void
  onCancel: () => void
    loading?: boolean
}

const DeleteModal = ({
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item?',
  onConfirm,
  onCancel,
    loading = false,
}: Props) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-lg">
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button onClick={onCancel}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-white bg-gray-100 dark:bg-gray-700 rounded"
          >
            Cancel
          </button>

          <button
  onClick={onConfirm}
  disabled={loading}
  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
>
  {loading ? 'Deleting...' : 'Delete'}
</button>
        </div>
      </div>
    </div>
  )
}

export default DeleteModal