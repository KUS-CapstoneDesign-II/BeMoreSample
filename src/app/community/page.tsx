"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { addCommunityPost, listCommunityPosts, likeCommunityPost } from "@/app/bemore-test/store";

export default function CommunityPage() {
  const topics = ["감사", "회복", "수면", "바운더리", "일상"] as const;
  const [topic, setTopic] = useState<(typeof topics)[number]>("감사");
  const [text, setText] = useState("");
  const [posts, setPosts] = useState(()=> [] as ReturnType<typeof listCommunityPosts>);
  useEffect(()=>{ setPosts(listCommunityPosts(topic)); }, [topic]);
  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">커뮤니티</h1>
        <p className="text-sm text-muted-foreground">익명으로 따뜻하게 나누어요. 안전 가이드를 먼저 읽어주세요.</p>
      </header>
      <Card className="p-4 text-xs text-muted-foreground">
        익명 규칙 · 존중 · 신고/차단 제공 · 위기시 지역 도움받기 리소스 안내(모크)
        <br/>모든 글은 이 브라우저에만 로컬로 저장되며 외부로 전송되지 않습니다.
      </Card>
      <div className="grid sm:grid-cols-5 gap-3">
        {topics.map((t)=> (
          <button key={t} onClick={()=>setTopic(t)} className={`rounded border p-2 text-xs ${topic===t?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>#{t}</button>
        ))}
      </div>
      <Card className="p-4 space-y-2">
        <div className="text-sm">짧은 한 문장 나누기</div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="post-input">한 문장 입력</label>
          <input id="post-input" className="flex-1 rounded border bg-background px-3 py-2 text-sm" placeholder={`${topic}에 대해 한 문장으로 적어주세요`} value={text} onChange={(e)=>setText(e.target.value)} />
          <button aria-label="글 올리기" className="rounded bg-primary text-primary-foreground px-3 text-sm" onClick={()=>{
            if (!text.trim()) return;
            addCommunityPost({ topic, text: text.trim() });
            setText("");
            setPosts(listCommunityPosts(topic));
          }}>올리기</button>
        </div>
      </Card>
      <div className="space-y-2">
        {posts.length===0 && <Card className="p-4 text-xs text-muted-foreground">아직 글이 없어요. 첫 글을 남겨보세요.</Card>}
        {posts.map(p=> (
          <Card key={p.id} className="p-3 text-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">#{p.topic} · {new Date(p.createdAt).toLocaleString()}</div>
              <div>{p.text}</div>
            </div>
            <button className="text-xs underline" onClick={()=>{ likeCommunityPost(p.id); setPosts(listCommunityPosts(topic)); }}>공감 {p.likes ?? 0}</button>
          </Card>
        ))}
      </div>
    </div>
  );
}


