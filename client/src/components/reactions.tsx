import { useState, useEffect } from "react";
import { Heart, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReactionsProps {
  type: "post" | "publication";
  id: number;
  likesCount: number;
  viewsCount: number;
}

export function Reactions({ type, id, likesCount, viewsCount }: ReactionsProps) {
  const storageKey = `liked_${type}_${id}`;
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(likesCount);
  const [showHeart, setShowHeart] = useState(false);

  useEffect(() => {
    setLiked(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  useEffect(() => { setLikes(likesCount); }, [likesCount]);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikes(l => l + 1);
    setShowHeart(true);
    localStorage.setItem(storageKey, "1");
    setTimeout(() => setShowHeart(false), 800);

    const table = type === "post" ? "posts" : "publications";
    try {
      await fetch(`/api/${table}/${id}/like`, { method: "POST" });
    } catch {}
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Eye className="w-4 h-4" />
        <span>{viewsCount} {viewsCount === 1 ? "vue" : "vues"}</span>
      </div>

      <button
        onClick={handleLike}
        disabled={liked}
        className="relative flex items-center gap-1.5 text-sm group"
        aria-label={liked ? "Déjà aimé" : "Aimer cet article"}
      >
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, y: 0 }}
              animate={{ scale: 1.5, y: -20, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute -top-2 left-0 text-red-500"
            >
              <Heart className="w-5 h-5 fill-current" />
            </motion.div>
          )}
        </AnimatePresence>
        <Heart className={`w-4 h-4 transition-all duration-300 ${liked ? "fill-red-500 text-red-500 scale-110" : "text-muted-foreground group-hover:text-red-400 group-hover:scale-110"}`} />
        <span className={liked ? "text-red-500 font-medium" : "text-muted-foreground"}>{likes}</span>
      </button>
    </div>
  );
}
