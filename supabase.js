import { createClient } from 'https://esm.sh/@supabase/supabase-js'
const supabaseUrl = 'https://mdvgdomhuejklqezlysb.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdmdkb21odWVqa2xxZXpseXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMTAxNjAsImV4cCI6MjA1NzU4NjE2MH0.CpmtcA-r2xncu8lT_fxmsH7kT470wA3mbdkG1xlg6lc"
const supabase = createClient(supabaseUrl, supabaseKey)


export async function submitComment(event) {
    event.preventDefault();
    try {
        const name = document.getElementById('name').value;
        const content = document.getElementById('content').value;
        if (!name || !content) {
            throw new Error('名称和内容不能为空！');
        }
        const { error } = await supabase.from('comments').insert([{ name, content }]);
        if (error) throw error;
        await loadComments();
        document.getElementById('name').value = '';
        document.getElementById('content').value = '';
        alert('提交成功！');
    } catch (error) {
        console.error('提交失败:', error); // 确保错误被输出
        alert(`提交失败: ${error.message}`);
    }
}

// 新增递归渲染函数（添加在文件顶部）
function renderComments(comments, parentId = null, level = 0) {
    return comments
        .filter(c => c.parent_id === parentId)
        .map(comment => `
            <div class="comment" style="margin-left: ${level * 30}px;">
                <div class="header">
                    <strong>${comment.name}</strong>
                    <span class="date">${new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <div class="content">${comment.content}</div>
                <div class="actions">
                    <button class="btn btn-sm btn-outline-success like-btn" data-id="${comment.id}">
                        👍 <span class="like-count">${comment.like_count || 0}</span>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary reply-btn" data-id="${comment.id}">
                        回复
                    </button>
                </div>
                <div class="replies-container" data-comment-id="${comment.id}"></div>
                ${renderComments(comments, comment.id, level + 1)}
            </div>
        `).join('');
}

// 修改后的loadComments函数（替换原有实现）
export async function loadComments() {
    const { data } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true });
    
    document.getElementById('comment-list').innerHTML = renderComments(data);
}

// 回复按钮点击（事件委托）
document.addEventListener('click', async (e) => {
    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn) {
        const commentId = replyBtn.dataset.id;
        const container = replyBtn.closest('.comment').querySelector('.replies-container');
        
        const formHTML = `
            <div class="reply-form" style="margin:15px 0 0 30px;">
                <input type="text" class="form-control mb-2" placeholder="你的名字" required>
                <textarea class="form-control mb-2" placeholder="回复内容" rows="2" required></textarea>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-primary submit-reply" data-id="${commentId}">提交回复</button>
                    <button type="button" class="btn btn-secondary cancel-reply">取消</button>
                </div>
            </div>
        `;
        
        container.innerHTML = formHTML;
    }
});

// 提交回复（事件委托）
document.addEventListener('click', async (e) => {
    const submitBtn = e.target.closest('.submit-reply');
    if (submitBtn) {
        const form = submitBtn.closest('.reply-form');
        const parentId = submitBtn.dataset.id;
        const name = form.querySelector('input').value;
        const content = form.querySelector('textarea').value;

        if (!name || !content) {
            alert('请填写姓名和内容');
            return;
        }

        try {
            const { error } = await supabase.from('comments').insert([{
                name,
                content,
                parent_id: parentId
            }]);

            if (!error) {
                await loadComments(); // 重新加载整个评论树
            }
        } catch (error) {
            console.error('回复失败:', error);
        }
    }
});

// 取消回复
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('cancel-reply')) {
        e.target.closest('.reply-form').remove();
    }
});

// 生成用户唯一标识（简易版）
function getUserId() {
    let userId = localStorage.getItem('user_id');
    if (!userId) {
        userId = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
        localStorage.setItem('user_id', userId);
    }
    return userId;
}



// 点赞处理（最终优化版）
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.like-btn');
    if (!btn) return;

    btn.disabled = true; // 立即禁用防止重复点击
    const commentId = btn.dataset.id;
    const userId = getUserId();
    const countSpan = btn.querySelector('.like-count');
    const originalCount = parseInt(countSpan.textContent) || 0;
    
    // 1. 乐观更新
    const isLiked = btn.classList.contains('active');
    const newCount = isLiked ? originalCount - 1 : originalCount + 1;
    countSpan.textContent = newCount;
    btn.classList.toggle('active', !isLiked);

    try {
        // 2. 合并操作到单个事务
        const { error } = await supabase.rpc('handle_like', {
            _comment_id: commentId,
            _user_id: userId,
            is_add: !isLiked
        });

        if (error) throw error;
    } catch (error) {
        // 3. 失败时回滚状态
        countSpan.textContent = originalCount;
        btn.classList.toggle('active', isLiked);
        console.error('操作失败:', error);
        alert('操作失败，请重试');
    } finally {
        btn.disabled = false;
    }
});

// 页面加载时加载评论
window.onload = loadComments;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault(); // 阻止表单默认提交
        await submitComment(event); // 调用提交函数
    });
});