import { useState } from 'react';

export default function CreatePage({ onCreateFullVideo, onCreateClip, latestFullVideoId }) {
  const [fullForm, setFullForm] = useState({
    title: '',
    description: '',
    durationMinutes: ''
  });
  const [clipForm, setClipForm] = useState({
    title: '',
    caption: '',
    durationSeconds: '',
    fullVideoId: latestFullVideoId || '',
    tags: ''
  });
  const [status, setStatus] = useState('');

  async function submitFullVideo(event) {
    event.preventDefault();
    await onCreateFullVideo(fullForm);
    setStatus('Full video created. You can now attach clips.');
    setFullForm({ title: '', description: '', durationMinutes: '' });
  }

  async function submitClip(event) {
    event.preventDefault();
    await onCreateClip({
      ...clipForm,
      tags: clipForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    });
    setStatus('Clip created and linked to full video.');
    setClipForm({ ...clipForm, title: '', caption: '', durationSeconds: '', tags: '' });
  }

  return (
    <section className="page-layout create-layout">
      <h2>Create</h2>
      <p>Upload full episodes and linked teaser clips.</p>
      {status ? <p className="success-text">{status}</p> : null}

      <form className="panel" onSubmit={submitFullVideo}>
        <h3>Upload Full Video</h3>
        <input
          placeholder="Title"
          value={fullForm.title}
          onChange={(event) => setFullForm({ ...fullForm, title: event.target.value })}
          required
        />
        <textarea
          placeholder="Description"
          value={fullForm.description}
          onChange={(event) => setFullForm({ ...fullForm, description: event.target.value })}
          required
        />
        <input
          placeholder="Duration in minutes"
          type="number"
          value={fullForm.durationMinutes}
          onChange={(event) => setFullForm({ ...fullForm, durationMinutes: event.target.value })}
          required
        />
        <button className="primary" type="submit">
          Publish Full Video
        </button>
      </form>

      <form className="panel" onSubmit={submitClip}>
        <h3>Upload Teaser Clip</h3>
        <input
          placeholder="Clip Title"
          value={clipForm.title}
          onChange={(event) => setClipForm({ ...clipForm, title: event.target.value })}
          required
        />
        <textarea
          placeholder="Caption"
          value={clipForm.caption}
          onChange={(event) => setClipForm({ ...clipForm, caption: event.target.value })}
          required
        />
        <input
          placeholder="Duration in seconds"
          type="number"
          value={clipForm.durationSeconds}
          onChange={(event) => setClipForm({ ...clipForm, durationSeconds: event.target.value })}
          required
        />
        <input
          placeholder="Full Video ID"
          value={clipForm.fullVideoId}
          onChange={(event) => setClipForm({ ...clipForm, fullVideoId: event.target.value })}
          required
        />
        <input
          placeholder="Tags (comma separated)"
          value={clipForm.tags}
          onChange={(event) => setClipForm({ ...clipForm, tags: event.target.value })}
        />
        <button className="primary" type="submit">
          Publish Clip
        </button>
      </form>
    </section>
  );
}