import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { Skeleton } from "./Skeleton";

interface Comment {
  id: string;
  market_id: string;
  user_id: string;
  username: string | null;
  first_name: string;
  text: string;
  parent_id: string | null;
  created_at: string;
}

interface CommentSectionProps {
  marketId: string;
}

export function CommentSection({ marketId }: CommentSectionProps) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", marketId],
    queryFn: async () => {
      const { data } = await api.get<Comment[]>(
        `/markets/${marketId}/comments`
      );
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (commentText: string) => {
      const { data } = await api.post(`/markets/${marketId}/comments`, {
        text: commentText,
      });
      return data;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["comments", marketId] });
    },
  });

  const handleSubmit = () => {
    if (text.trim()) {
      mutation.mutate(text.trim());
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold mb-3">
        Comments ({comments?.length ?? 0})
      </h3>

      {/* Comment input */}
      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Add a comment..."
          maxLength={1000}
          className="flex-1 bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || mutation.isPending}
          className="px-4 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}

        {comments?.map((comment) => (
          <div key={comment.id} className="border-b border-gray-50 pb-2 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold">
                {comment.first_name}
              </span>
              {comment.username && (
                <span className="text-xs text-tg-hint">
                  @{comment.username}
                </span>
              )}
              <span className="text-xs text-tg-hint ml-auto">
                {new Date(comment.created_at).toLocaleString("ru", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm">{comment.text}</p>
          </div>
        ))}

        {!isLoading && (!comments || comments.length === 0) && (
          <div className="text-center text-tg-hint text-xs py-4">
            No comments yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );
}
