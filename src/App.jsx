import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          InsureScope
        </h1>
        <p className="text-gray-600 text-center mb-6">
          AI-powered insurance coverage analysis
        </p>
        
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Count is {count}
          </button>
          
          <div className="flex gap-2 mt-4">
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
              React ✓
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium">
              Vite ✓
            </span>
            <span className="px-3 py-1 bg-teal-100 text-teal-800 text-sm rounded-full font-medium">
              Tailwind ✓
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
