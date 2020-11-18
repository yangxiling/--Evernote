import React, { Component } from 'react';
import 'github-markdown-css';
import 'normalize.css';
import marked from 'marked';
import cx from 'classnames';
import Swal from 'sweetalert2';
import axios from 'axios';
import dateUtil from './utils/date';
// import request from './utils/request';
import './App.scss';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      notebooks: [],
      currentBookIndex: 0,

      notes: [],

      currentNote: null
    }
  }

  componentDidMount() {
    //渲染 notebooks 列表
    document.title = '印象笔记';
    window.addEventListener('beforeunload', () => {
      let data = {
        currentBookIndex: this.state.currentBookIndex,
        currentNoteId: this.state.currentNote ? this.state.currentNote.id : null
      }
      localStorage.setItem('evernoteEditData', JSON.stringify(data));
    });
    var json = localStorage.getItem('evernoteEditData')
    if (json) {
      var data = JSON.parse(json);
      this.setState({ currentBookIndex: data.currentBookIndex })
    }
    this.loadNotebooks(data);
  }

  render() {
    let notebooks = this.state.notebooks;
    let notes = this.state.notes;
    let currentNote = this.state.currentNote;
    return (
      <div className="app">
        <div className="sidebar">
          <div className="header">
            <button className="button adder" onClick={() => this.addNote()}>
              <i className="iconfont icon-add"></i>
                新建笔记
              </button>
          </div>

          <div className="body">
            <div className="notebooks">
              <div className="header has-icon">
                <i className="iconfont icon-books"></i>
                笔记本
              </div>
              <div className="body">
                <ul className="nodebooks-list">
                  {
                    notebooks.map((notebook, index) => (
                      <li key={notebook.id}
                        className={cx('notebook-item', { active: this.state.currentBookIndex === index })}
                        // className={'notebook-item '+(this.state.currentBookIndex === index?'active':'') }
                        onClick={() => this.loadNotes(index)}>
                        <div className="title has-icon">
                          <i className="iconfont icon-book"></i>
                          {notebook.name}
                        </div>
                        <button className="button trash"><i className="iconfont icon-trash"></i></button>
                      </li>
                    ))
                  }
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="notes-panel">
          <div className="header">读书笔记</div>
          <div className="body">
            <ul className="notes-list">
              {
                notes.map((note) => (
                  <li key={note.id}>
                    <div className={cx('note-brief', { active: currentNote && currentNote.id === note.id })}>
                      <div className="box"
                        onClick={() => this.loadNote(note.id)}>
                        <div className="header">{note.title}</div>
                        <div className="body">{getBrief(note.body)}</div>
                      </div>
                      <div className="footer">
                        <div className="datetime">
                          {dateUtil.friendly(note.datetime)}
                        </div>
                        <button className="trash button" onClick={() => this.requestDeleteNote(note.id)}>
                          <i className="iconfont icon-trash"></i>
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              }
            </ul>
          </div>
        </div>
        {currentNote ?
          <div className="note-panel">
            <div className="header">
              <div className="category has-icon">
                <i className="iconfont icon-notebook"></i>
                {this.getNoteBook(this.state.currentNote.notebookId).name}
              </div>
              <div className="title">
                <input type="text" value={currentNote.title || ''}
                  onChange={e => this.updateCurrentNote('title', e.target.value)} />
              </div>
            </div>
            <div className="body">
              <div className="editor">
                <textarea value={currentNote.body}
                  onChange={(e) => this.updateCurrentNote('body', e.target.value)}
                  onKeyDown={e => this.handleTextKeydown(e)}></textarea>
              </div>
              <div className="preview markdown-body">
                <div dangerouslySetInnerHTML={{ __html: marked(currentNote.body || '') }}></div>
              </div>
            </div>
          </div> : null
        }
      </div>
    );
  }
  //tab对齐
  handleTextKeydown(e) {
    if(e.keyCode === 9){
      let el = e.target;
      e.preventDefault();
      let selectionStartPos = el.selectionStart;
      let selectionEndPos = el.selectionEnd;
      let oldContent = el.value;
      console.log(selectionStartPos,selectionEndPos)
      el.value = oldContent.substr(0,selectionStartPos)+"\t"+oldContent.substr(selectionEndPos);
      // el.selectionStart = el.selectionEnd = selectionStartPos+1;
      // console.log(el.selectionStart)
    }
  }
  //添加新笔记
  addNote() {
    let notebooksIndex = this.state.currentBookIndex;
    let note = {
      title: '新建笔记',
      body: '',
      datetime: new Date().toString(),
      notebookId: notebooksIndex
    }
    axios.post('http://localhost:3100/notes', note).then(
      this.reloadNotes(notebooksIndex))
  }
  //删除笔记  页面删除
  requestDeleteNote(noteId) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.value) {
        this.deleteNote(noteId);  //服务端删除
        let currentNote = this.state.currentNote;
        if (currentNote && currentNote.id === noteId) {
          this.setState({ currentNote: null })
        }
        Swal.fire(
          'Deleted!',
          'Your file has been deleted.',
          'success'
        )
      }
    })
  }
  //服务端删除
  deleteNote(noteId) {
    axios.delete('http://localhost:3100/notes/' + noteId).then(
      data => {
        console.log(data)
        let notebooksIndex = this.state.currentBookIndex
        this.reloadNotes(notebooksIndex);
      }
    )
  }
  //获取笔记本列表 notebooks 
  loadNotebooks(editData) {
    editData = editData || {};
    // axios.get('http://localhost:3100/notebooks/')
    axios.get('http://localhost:3100/notebooks/').then(notebooks => {
      // console.log(notebooks)
      this.setState({ notebooks: notebooks.data }, () => {
        var bookIndex = editData.currentBookIndex || 0;
        this.loadNotes(bookIndex);
        if (editData.currentNoteId) {
          this.loadNote(editData.currentNoteId)
        }
      })
    })
  }
  //根据currentBookIndex  渲染笔记 notes 列表 
  loadNotes(notebooksIndex) {
    this.setState({ currentBookIndex: notebooksIndex });
    let curNoteBookIndex = this.state.notebooks[notebooksIndex];
    axios.get('http://localhost:3100/notes?notebookId=' + curNoteBookIndex.id).then(
      notes => {
        this.setState({ notes: notes.data });
      })
  }
  reloadNotes(notebooksIndex) {
    this.loadNotes(notebooksIndex)
  }
  loadNote(id) {
    axios.get('http://localhost:3100/notes?id=' + id).then(
      note => {
        // console.log(note)  
        this.setState({ currentNote: note.data[0] })
      }
    )
    // var opts = {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(note)
    // }
    // request('/notes?id=' + id, opts)
    //   .then(note => {
    //     this.setState({ currentNote: note });
    //   })
  }
  getNoteBook(notebooksIndex) {
    // console.log('currentNote:'+currentNote)
    let books = this.state.notebooks;
    return books.find(book => book.id === notebooksIndex)
  }
  //更新当前笔记
  updateCurrentNote(field, value) {
    let currentNote = this.state.currentNote;
    currentNote[field] = value;
    this.setState({ currentNote: currentNote })

    // var opts = {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(currentNote)
    // }
    axios.put('http://localhost:3100/notes/'+currentNote.id,currentNote).then(
      res => {
        this.updateNoteFinish(res)
      }
    )
    let currentBookIndex = this.state.currentBookIndex;
    this.reloadNotes(currentBookIndex)
  }
  updateNoteFinish(note) {
    let notes = this.state.notes;
    let index = notes.findIndex(o => o.id === note.id);
    if (index !== -1) {
      notes[index] = note;
    }
    this.setState({ notes: notes });
  }
}
export default App;

function getBrief(body) {
  body = body || '';
  return body.length > 100 ? body.substr(0, 70) + '...' : body;
}