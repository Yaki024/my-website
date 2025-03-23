import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://mdvgdomhuejklqezlysb.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdmdkb21odWVqa2xxZXpseXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMTAxNjAsImV4cCI6MjA1NzU4NjE2MH0.CpmtcA-r2xncu8lT_fxmsH7kT470wA3mbdkG1xlg6lc"
const supabase = createClient(supabaseUrl, supabaseKey)

// 分页相关变量
let currentPage = 0
const COMMENTS_PER_PAGE = 10
let totalComments = 0
let allComments = []

// 提交评论
export async function submitComment(event) {
    event.preventDefault()
    try {
        const name = document.getElementById('name').value
        const content = document.getElementById('content').value
        if (!name || !content) {
            throw new Error('名称和内容不能为空！')
        }

        const { error } = await supabase
            .from('comments')
            .insert([{ name, content }])

        if (error) throw error

        // 提交后重置分页
        currentPage = 0
        await loadComments()
        document.getElementById('name').value = ''
        document.getElementById('content').value = ''
        alert('提交成功！')
    } catch (error) {
        console.error('提交失败:', error)
        alert(`提交失败: ${error.message}`)
    }
}

// 递归渲染评论
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
        `).join('')
}

// 加载评论（支持分页）
export async function loadComments(loadMore = false) {
    try {
        if (!loadMore) {
            currentPage = 0
            allComments = []
        }

        // 获取分页数据
        const { data, count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: true })
            .range(
                currentPage * COMMENTS_PER_PAGE,
                (currentPage + 1) * COMMENTS_PER_PAGE - 1
            )

        if (error) throw error

        totalComments = count
        allComments = [...allComments, ...data]
        currentPage++

        // 渲染评论和分页按钮
        const commentsHTML = renderComments(allComments)
        const paginationHTML = totalComments > allComments.length
            ? `<div class="text-center mt-3">
                 <button class="btn btn-success" id="load-more-btn">展开更多评论（${totalComments - allComments.length}条剩余）</button>
               </div>`
            : totalComments > COMMENTS_PER_PAGE
                ? '<p class="text-muted mt-3">已显示所有评论</p>'
                : ''

        document.getElementById('comment-list').innerHTML = commentsHTML + paginationHTML

        // 绑定加载更多事件
        const loadMoreBtn = document.getElementById('load-more-btn')
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => loadComments(true))
        }
    } catch (error) {
        console.error('加载评论失败:', error)
        alert('加载评论失败，请稍后重试')
    }
}

// 点赞功能
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.like-btn')
    if (!btn) return

    btn.disabled = true
    const commentId = btn.dataset.id
    const userId = getUserId()
    const countSpan = btn.querySelector('.like-count')
    const originalCount = parseInt(countSpan.textContent) || 0

    // 乐观更新
    const isLiked = btn.classList.contains('active')
    const newCount = isLiked ? originalCount - 1 : originalCount + 1
    countSpan.textContent = newCount
    btn.classList.toggle('active', !isLiked)

    try {
        const { error } = await supabase.rpc('handle_like', {
            _comment_id: commentId,
            _user_id: userId,
            is_add: !isLiked
        })

        if (error) throw error
    } catch (error) {
        countSpan.textContent = originalCount
        btn.classList.toggle('active', isLiked)
        console.error('操作失败:', error)
        alert('操作失败，请重试')
    } finally {
        btn.disabled = false
    }
})

// 用户标识
function getUserId() {
    let userId = localStorage.getItem('user_id')
    if (!userId) {
        userId = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
        localStorage.setItem('user_id', userId)
    }
    return userId
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadComments()
    document.querySelector('form').addEventListener('submit', submitComment)
})

// 回复功能完整实现
document.addEventListener('click', async (e) => {
    // 处理回复按钮点击
    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn) {
        const commentId = replyBtn.dataset.id;
        const container = replyBtn.closest('.comment').querySelector('.replies-container');

        // 移除现有回复表单
        document.querySelectorAll('.reply-form').forEach(form => form.remove());

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

    // 处理取消回复
    if (e.target.classList.contains('cancel-reply')) {
        e.target.closest('.reply-form').remove();
    }
});

// 处理回复提交
document.addEventListener('click', async (e) => {
    const submitBtn = e.target.closest('.submit-reply');
    if (!submitBtn) return;

    const form = submitBtn.closest('.reply-form');
    const parentId = submitBtn.dataset.id;
    const nameInput = form.querySelector('input');
    const contentInput = form.querySelector('textarea');

    try {
        // 验证输入
        if (!nameInput.value.trim() || !contentInput.value.trim()) {
            alert('请填写姓名和内容');
            return;
        }

        // 提交回复
        const { error } = await supabase.from('comments').insert([{
            name: nameInput.value.trim(),
            content: contentInput.value.trim(),
            parent_id: parentId
        }]);

        if (error) throw error;

        // 刷新评论并保持当前分页
        await loadComments(true);
        form.remove();
    } catch (error) {
        console.error('回复失败:', error);
        alert('回复提交失败，请稍后重试');
    }
});