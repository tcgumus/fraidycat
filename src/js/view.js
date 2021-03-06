import { followTitle, getIndexById, house, Importances } from './util'
import { h } from 'hyperapp'
import { jsonDateParser } from "json-date-parser"
import { Link, Route, Switch } from '@kickscondor/router'
import globe from '../images/globe.svg'
import images from '../images/*.png'
import EmojiButton from '@kickscondor/emoji-button'
const url = require('url')
const sparkline = require('./sparkline')
import u from '@kickscondor/umbrellajs'

const CAN_ARCHIVE = (process.env.STORAGE === 'dat')

const FormFreeze = (e) => {
  e.preventDefault()
  u('button', e.target).each(ele => ele.disabled = true)
}

const FollowForm = (match, setup, isNew) => ({follows}, actions) => {
  let follow = follows.editing
  let picker = new EmojiButton()
  if (setup) {
    if ('tag' in match.params) {
      follow.tags = [match.params.tag]
    }
    if ('importance' in match.params) {
      follow.importance = Number(match.params.importance)
    }
  }
  picker.on('emoji', ch => {
    if (follow.tags) { follow.tags.push(ch) } else { follow.tags = [ch] }
    actions.follows.set({follow})
  })

  return follow && <form class="follow" onsubmit={FormFreeze}>
    {isNew &&
      <div>
        <label for="url">URL <img src={images['supported']} /></label>
        <input type="text" id="url" name="url" value={follow.url} autocorrect="off" autocapitalize="none"
          oninput={e => follow.url = e.target.value} />
        <p class="note">(Also see <a href="https://rss.app/">RSS.app</a> and <a href="https://rssbox.herokuapp.com">RSS Box</a> for other services.)</p>
      </div>}

    <div>
      <label for="importance">Importance</label> 
      <select id="importance" name="importance" onchange={e => follow.importance = Number(e.target.options[e.target.selectedIndex].value)}>
      {Importances.map(imp => 
        <option value={imp[0]} selected={imp[0] == follow.importance}>{imp[1]}</option>)}
      </select>
    </div>

    <div>
      <label for="tags" class="optional">Tag(s) &mdash; separate with spaces</label>
      <input type="text" id="tags" value={follow.tags ? follow.tags.join(' ') : ''}
        oninput={e => e.target.value ? (follow.tags = e.target.value.trim().split(/\s+/)) : (delete follow.tags)} />
      <a href="#" class="emoji" onclick={e => {
        e.preventDefault()
        picker.pickerVisible ? picker.hidePicker() : picker.showPicker(e)
      }}>&#128513;</a>
      <p class="note">(If left blank, tag is assumed to be '&#x1f3e0;'&mdash;the main page tag.)</p>
    </div>

    <div>
      <label for="title" class="optional">Title</label>
      <input type="text" id="title" value={follow.title}
        oninput={e => follow.title = e.target.value} />
      <p class="note">(Leave empty to use <em>{follow.actualTitle || "the title loaded from the site"}</em>.)</p>
    </div>

    {CAN_ARCHIVE &&
      <div>
        <input type="checkbox" id="fetchesContent" onclick={e => follow.fetchesContent = e.target.checked} checked={follow.fetchesContent} />
        <label for="fetchesContent">Read here?</label>
        <p class="note">(Check this to save a copy of complete posts and read them from Fraidycat.)</p>
      </div>}

    <button onclick={e => actions.follows.save(follow)}>Save</button>
    {!isNew && <button class="delete" onclick={_ => actions.follows.confirmRemove(follow)}>Delete This</button>}
  </form>
}

const EditFollowById = ({ match, setup }) => ({follows}) => {
  if (setup)
    follows.editing = JSON.parse(JSON.stringify(follows.all[match.params.id]), jsonDateParser)

  return <div id="edit-feed">
    <h2>Edit a Follow</h2>
    <p>URL: {follows.editing.url}</p>
    {FollowForm(match, setup, false)}
  </div>
}

const AddFollow = ({ match, setup }) => ({follows}) => {
  if (setup)
    follows.editing = {importance: 0}

  return <div id="add-feed">
    <h2>Add a Follow</h2>
    <p>What blog, wiki or social account do you want to follow?</p>
    <p class="note"><em>This can also be a Twitter or Instagram feed, a YouTube channel, a subreddit, a Soundcloud.</em></p>
    {FollowForm(match, setup, true)}
  </div>
}

const AddFeed = () => ({follows, settings}, actions) => {
  let {list, site} = follows.feeds
  return list.length == 0 ? 
      <div id="feed-select">
        <h2>No Feeds Discovered</h2>
        <p>This URL seems to have no feeds. Check with the site's owner&mdash;perhaps
          they can give you the direct feed URL.</p>
      </div>
    : <div id="feed-select">
        <h2>Select a Feed</h2>
        <p>{followTitle(site)} has several feeds:</p>
        <form class="feeds" onsubmit={FormFreeze}>
        <ul>
        {list.map(feed =>
          <li><input type="checkbox" onclick={e => feed.selected = e.target.checked} value={feed.href} /> {feed.title}</li>)}
        </ul>
        <button onclick={_ => actions.follows.subscribe(follows.feeds)}>Subscribe</button>
        </form>
      </div>
}

function timeAgo(from_time, to_time) {
  from_time = Math.floor(from_time / 1000)
  to_time = Math.floor(to_time / 1000)
  let mins = Math.round(Math.abs(to_time - from_time)/60)

  if (mins >= 0 && mins <= 1) 
    return '1m'
  if (mins >= 2 && mins <= 45)
    return mins + 'm'
  if (mins >= 46 && mins <= 90)
    return '1h'
  if (mins >= 91 && mins <= 1440)
    return Math.round(mins / 60) + 'h'
  if (mins >= 1441 && mins <= 2880)
    return '1d'
  if (mins >= 2881 && mins <= 43220)
    return Math.round(mins / 1440) + 'd'
  if (mins >= 43201 && mins <= 86400)
    return '1M'
  if (mins >= 86401 && mins <= 525960)
    return Math.round(mins / 43200) + 'M'
  if (mins >= 525961 && mins <= 1051920)
    return '1Y'
  return Math.round(mins / 525600) + 'Y'
}

function timeDarkness(from_time, to_time) {
  from_time = Math.floor(from_time / 1000)
  to_time = Math.floor(to_time / 1000)
  let mins = Math.round(Math.abs(to_time - from_time)/60)

  if (mins >= 0 && mins < 3600)
    return 'age-h'
  if (mins >= 3600 && mins <= 43220)
    return 'age-d'
  return 'age-M'
}

function sparkpoints(el, ary, daily) {
  let points = [], len = ary.length
  if (daily) {
    points = ary.slice(0, 60)
    if (points.every(x => x == 0))
      daily = false
    else
      len = points.length
  }
  if (!daily) {
    len = Math.ceil(len / 3)
    for (let i = 0; i < len; i++) {
      let x = i * 3
      points[i] = (ary[x] || 0) + (ary[x + 1] || 0) + (ary[x + 2] || 0)
    }
    if (points.every(x => x == 0))
      len = 0
  }
  u(el).addClass(`sparkline-${daily ? "d" : "w"}`).attr('width', len * 2)
  if (len > 0)
    sparkline(el, points.reverse())
}

function lastPostTime(follow) {
  if (follow.posts) {
    let lastPost = follow.posts[0]
    if (lastPost)
      return lastPost.updatedAt
  }
  return new Date(0)
}

function rewriteUrl(a, base) {
  if (a.href && !a.href.match(/^[a-z]+:\/\//))
    a.href = base + "/" + a.href
  if (a.src && !a.src.match(/^[a-z]+:\/\//))
    a.src = base + "/" + a.src
}

const ViewFollowById = ({ match }) => ({follows}, actions) => {
  let now = new Date()
  let follow = follows.all[match.params.id]
  let posts = actions.follows.getPosts(follow.id, 0, 20)
  return <div id="reader">
    <h2>{followTitle(follow)}</h2>
    {follow.description && <div class="note">{follow.description}</div>}
    <ol>{posts && posts.slice(0, 20).map(post => {
      let details = actions.follows.getPostDetails({post, id: follow.id})
      return <li key={post.id}>
        <h3>{details && details.title}</h3>
        <div class="content"><custom-element>{details && (details.description || details.content_html || (details.content ? details.content.text : ""))}</custom-element></div>
        <div class="meta">{timeAgo(post.updatedAt, now)} ago</div>
      </li>
    })}
    </ol>
    </div>
}

const ListFollow = ({ location, match }) => ({follows}, actions) => {
  let now = new Date()
  let tag = match.params.tag ? match.params.tag : house
  let tags = {}, imps = {}
  let viewable = Object.values(follows.all).filter(follow => {
    let ftags = (follow.tags || [house])
    let lastPost = (follow.posts && follow.posts[0])
    ftags.forEach(k => {
      let at = tags[k]
      if (!at)
        tags[k] = at = new Date(0)
      if (lastPost && follow.importance === 0 && at < lastPost.updatedAt)
        tags[k] = lastPost.updatedAt
    })
    let isShown = ftags.includes(tag)
    if (isShown) imps[follow.importance] = true
    return isShown
  }).sort((a, b) => (a.importance - b.importance) || (lastPostTime(b) - lastPostTime(a)))
  let impa = Object.keys(imps)
  let imp = match.params.importance || (impa.length > 0 ? Math.min(...impa) : 0)
  viewable = viewable.filter(follow => (follow.importance == imp))
  let tagTabs = Object.keys(tags).filter(t => t != house).sort()
  tagTabs.unshift(house)
  let addLink = '/add?tag=' + encodeURIComponent(tag) + '&importance=' + imp
  u('a.pink').attr('href', (location.hashRouting ? '#!' : '') + addLink)

  return <div id="follows">
    <ul id="tags">
    {tagTabs.map(t => <li class={timeDarkness(tags[t], now)}><Link to={`/tag/${t}`} class={t == tag ? 'active ' : null}>{t}</Link></li>)}
    </ul>
    <ul id="imps">
    {Importances.map(sel => (sel[0] == imp ? <li class='active'>{sel[1]}</li> :
      ((imps[sel[0]] || sel[0] === 0) &&
        <li><Link to={`/tag/${tag}?importance=${sel[0]}`}>{sel[1]}</Link></li>)))}
    </ul>
    {viewable.length > 0 ?
      <ol>{viewable.map(follow => {
          let lastPost = (follow.posts && follow.posts[0]), tags = []
          let ago = lastPost && timeAgo(lastPost.updatedAt, now)
          let dk = lastPost && timeDarkness(lastPost.updatedAt, now)
          let daily = follow.importance < 7
          let linkUrl = follow.fetchesContent ? `/view/${follow.id}` : follow.url
          let id = `follow-${follow.id}`
          return <li key={id} class={dk || 'age-X'}>
            <a name={id}></a>
            <h3>
              <Link to={linkUrl}>
                <img class="favicon" src={url.resolve(follow.url, follow.photo || '/favicon.ico')}
                  onerror={e => e.target.src=globe} width="20" height="20" />
              </Link>
              <Link class="url" to={linkUrl}>{followTitle(follow)}</Link>
              {ago && <span class="latest">{ago}</span>}
              <span title={`graph of the last ${daily ? 'two' : 'six'} months`}>
                <svg class="sparkline"
                  width="120" height="20" stroke-width="2"
                  oncreate={el => sparkpoints(el, follow.activity, daily)}></svg></span>
                <Link to={`/edit/${follow.id}`} class="edit" title="edit"><img src={images['270f']} /></Link>
            </h3>
            <div class="extra trunc">
              <div class="post">{follow.posts &&
                <ol class="title">{follow.posts.map(f => {
                  let postAge = timeAgo(f.updatedAt, now)
                  return <li class={timeDarkness(f.updatedAt, now)}>{follow.fetchesContent ? f.title : <a href={f.url}>{f.title}</a>}
                    <span>{timeAgo(f.updatedAt, now)}</span>
                  </li>
                })}</ol>}
                {!follow.fetchesContent && <a class="collapse" href="#"
                  onclick={e => {e.preventDefault(); u(e.target).closest(".extra").toggleClass("trunc")}}>
                    <span class="enter">&#x2ba8;</span>
                    <span class="close">&#x1f7ab;</span>
                    </a>}
              </div>
            </div>
          </li>
        })}</ol> :
        <div class="intro">
          <h3>Ready?</h3>
          <p>Let's get Fraidycat going, yeah?</p>
          <p>Click the <Link to={addLink} class="pink" title="Add a Follow">&#xff0b;</Link> button to add someone!</p>
          <p>Or, click the <Link to="/settings" title="Settings">&#x2699;&#xfe0f;</Link> to import a bunch.</p>
          <p><em>Hey! Follows added to this <strong>Real-time</strong> page will highlight the tab when there are new posts!</em></p>
        </div>}
  </div>
}

const ImportFrom = (format) => {
  let imp = document.getElementById('fileImp')
  imp.name = format
  imp.click()
}

const ChangeSettings = ({ match, setup }) => (_, {follows}) => {
  return <div id="settings">
    <form onsubmit={e => e.preventDefault()}>
    <input type="file" id="fileImp" style="display: none" name=""
      onchange={e => follows.importFrom(e)} />
    <h3>Import / Export</h3>
    <div>
      <p><strong>JSON:</strong>
        <button onclick={e => ImportFrom('json')}>Full Import</button>
        <button onclick={e => follows.exportTo('json')}>Full Export</button></p>
      <p class="note">This will save <em>all</em> of your Fraidycat settings.</p>
    </div>
    <div>
      <p>
        <strong>OPML:</strong>
        <button onclick={e => ImportFrom('opml')}>Import Follows</button>
        <button onclick={e => follows.exportTo('opml')}>Export Follows</button>
      </p>
      <p class="note">This will only backup your follows.</p>
    </div>
    <div>
      <p>
        <strong>HTML:</strong>
        <button onclick={e => follows.exportTo('html')}>Export Follows</button>
      </p>
      <p class="note">This is just for fun - a bookmarks list in HTML.</p>
    </div>
    <h3>About Fraidycat</h3>
    <div>
      <p>
        Fraidycat is a desktop app or browser extension for Firefox or Chrome. You can use it to follow people (hundreds) on whatever platform they choose - Twitter, a blog, YouTube, even on a public TiddlyWiki.
      </p>
      <p>
        You can learn more about Fraidycat in its <a href="https://fraidyc.at/">home page</a>.
      </p>
    </div>
    </form>
  </div>
}

if (process.env.STORAGE === 'electron') {
  window.addEventListener('mouseover', e => {
    if (e.target.nodeName === "A" && e.target.href && e.target.host !== window.location.host) {
      u('footer p').text(e.target.href)
      u('footer').addClass('show')
    }
  })
  window.addEventListener('mouseout', e =>
    e.target.nodeName === "A" && u('footer').removeClass('show'))
}

export default (state, actions) => {
  let settings = window.location.pathname === "/settings.html"
  if (!state.follows.started)
    return ''

  //	
  // Report progress on follows that are currently updating.	
  //	
  let upd = state.follows.updating, urgent = state.follows.urgent	
  let updDone = 0, updTotal = 0, note = null, last = new Date()	
  for (let id in upd) {	
    let f = upd[id]	
    updTotal++	
    if (f.done) {	
      updDone++	
    } else if (!note || f.startedAt < last) {	
      note = id.substring(0, id.length - 9)	
      last = f.startedAt	
    }	
  }

  return <article>
      <header>
        <h1><Link to="/"><img src={images['fc']} alt="Fraidycat" title="Fraidycat" /></Link></h1>
      </header>
      <section>
        <div id="menu">
          {!settings && <ul>
            {updTotal > 2 ?	
              <li id="notice">	
                <div class="progress"><div style={`width: ${Math.round((updDone / updTotal) * 100)}%`}></div></div>	
                <p>{note}</p>	
              </li> :	
              (urgent && <li id="urgent"><p><a href="#" onclick={e => {	
                e.preventDefault(); urgent.approve()}}>{urgent.note}</a></p></li>)}
            <li><Link to="/add" class="pink" title="Add a Follow">&#xff0b;</Link></li>
            <li><Link to="/settings" title="Settings">&#x2699;&#xfe0f;</Link></li>
          </ul>}
        </div>

        <Switch>
          <Route path="/settings" render={ChangeSettings} />
          <Route path="/add" render={AddFollow} />
          <Route path="/add-feed" render={AddFeed} />
          <Route path="/edit/:id" render={EditFollowById} />
          <Route path="/view/:id" render={ViewFollowById} />
          <Route path="/tag/:tag" render={ListFollow} />
          <Route render={settings ? ChangeSettings : ListFollow} />
        </Switch>
      </section>
      <footer>
        <p>&nbsp;</p>
      </footer>
    </article>
}
