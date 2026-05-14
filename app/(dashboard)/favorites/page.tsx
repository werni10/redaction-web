import { Star } from 'lucide-react'

export default function FavoritesPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Star size={20} className="text-pink-500" />
        <h1 className="text-xl font-bold text-gray-800">Favoris</h1>
      </div>
      <div className="text-center py-20 text-gray-400">
        <Star size={40} className="mx-auto mb-4 opacity-30" />
        <p>Fonctionnalité bientôt disponible.</p>
      </div>
    </div>
  )
}
