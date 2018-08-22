var payload = function(){

  var $ = window.jQuery
  if (typeof $ !== 'function') return

  var is_match, country, channel
  var initialize_page_content, display_links, display_videos
  var max_polling_attempts, polling_timers, poll_for_DOM
  var process_channel, process_channel_list, process_country_list

  (function(){
    var pattern = new RegExp('^/Live(?:/([^/]+))?(?:/([^/]+))?.*$')
    var matches = pattern.exec(window.location.pathname)

    if (matches)    is_match = true
    if (matches[1]) country  = matches[1]
    if (matches[2]) channel  = matches[2]
  })()
  if (! is_match) return

  initialize_page_content = function() {
    $.each(polling_timers, function(selector, timer){
      clearTimeout(timer)
    })
    polling_timers = {}

    window.document.body.innerHTML = ''
  }

  display_links = function(links, $target) {
    // links = [{title, url}]

    $target = $target || $(window.document.body).css('margin', '20px')

    var $ul = $('<ul></ul>').appendTo($target)
    links.forEach(({title, url}) => {
      let $li, $a
      $li = $('<li></li>')
        .appendTo($ul)
      $a = $('<a></a>')
        .text(title)
        .attr('href', url)
        .appendTo($li)
    })
  }

  display_videos = function(videos) {
    // videos = [{title, url}]

    var $contents = $(`
<div>
  <div id="videos"></div>
  <div id="links">
    <div id="links_direct">
      <h3>direct</h3>
    </div>
    <div id="links_webcast">
      <h3>webcast</h3>
    </div>
  </div>
</div>`
    )
    .css('margin', '20px')
    .appendTo(window.document.body)

    var $videos, $direct, $webcast
    $videos  = $contents.find('div#videos').css('height', '1px').css('overflow', 'hidden')
    $direct  = $contents.find('div#links_direct')
    $webcast = $contents.find('div#links_webcast')

    var links_direct = []
    var links_webcast = []

    videos.forEach(({title, url}) => {
      let $video, $source

      $video = $('<video></video>')
        .appendTo($videos)
      $source = $('<source></source>')
        .attr('src', url)
        .appendTo($video)

      links_direct.push({
        title,
        url
      })

      links_webcast.push({
        title,
        url: 'https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html#/watch/' + window.btoa(url)
      })
    })

    display_links(links_direct,  $direct)
    display_links(links_webcast, $webcast)
  }

  max_polling_attempts = 80  // 20 seconds
  polling_timers = {}

  poll_for_DOM = function(selector, cb, counter) {
    counter = counter || 0

    var $DOM = $(selector)
    if ($DOM && $DOM.length) {
      cb()
    }
    else if (counter < max_polling_attempts) {
      polling_timers[selector] = window.setTimeout(
        function() { poll_for_DOM(selector, cb, (counter + 1)) },
        250
      )
    }
  }

  // deprecated: `inject_next_tic` should prevent either selector from being added to DOM
  process_channel = function() {
    var detect_multiple_stream_options = function() {
      var selector = 'a.streamSelectBtn[onclick]'

      poll_for_DOM(selector, function() {
        var videos = []
        var title

        window.checkIfCanPlay = function(url) {
          videos.push({title, url})
        }

        $(selector).each((i, el) => {
          title = el.innerText
          el.click()
        })

        initialize_page_content()
        display_videos(videos)
      })
    }

    var detect_video_player = function() {
      var selector = '#playerContainer > video[src]'

      poll_for_DOM(selector, function() {
        var videos = [{
          title: 'Stream #1',
          url: $(selector).attr('src')
        }]

        initialize_page_content()
        display_videos(videos)
      })
    }

    detect_multiple_stream_options()
    detect_video_player()
  }

  process_channel_list = function() {
    var selector = '.row.list-group > .item'

    poll_for_DOM(selector, function() {
      var links = []

      $(selector).each((i, item) => {
        let $item   = $(item)
        let $img    = $item.find('img[alt]')
        let $a      = $item.find('a[href]')
        let channel = $img.attr('alt')
        let url     = 'https://www.firstonetv.net' + $a.attr('href')
        if (url !== 'https://www.firstonetv.net/Register-Login') {
          links.push({title: channel, url})
        }
      })

      initialize_page_content()
      display_links(links)
    })
  }

  process_country_list = function() {
    process_channel_list()
  }

  if (country && channel) {
    process_channel()
  }
  else if (country) {
    process_channel_list()
  }
  else {
    process_country_list()
  }

  // globals
  window.initialize_page_content = initialize_page_content
  window.display_videos = display_videos
}

var inject_function = function(_function){
  var inline, script, head

  inline = document.createTextNode(
    '(' + _function.toString() + ')()'
  )

  script = document.createElement('script')
  script.appendChild(inline)

  head = document.head
  head.appendChild(script)
}

if (document.readyState === 'complete'){
  inject_function(payload)
}
else {
  document.onreadystatechange = function(){
    if (document.readyState === 'complete'){
      inject_function(payload)
    }
  }
}

var inject_next_tic = function() {
  if (document.head === null) {
    setTimeout(inject_next_tic, 0)
  }
  else {
    inject_function(function(){
      var handoff_videos = function(videos) {
        if (typeof window.display_videos !== 'function') {
          setTimeout(() => handoff_videos(videos), 10)
        }
        else {
          window.initialize_page_content()
          window.display_videos(videos)
        }
      }

      window.checkIfCanPlay = function(url, json) {
        var videos = []

        if (json && (!url || url.length < 3)) {
          try {
            json = JSON.parse(json)

            jQuery.each(json, function(title, url){
              videos.push({title, url})
            })
          }
          catch(e){
            url = json
          }
        }
        if (url && url.length >= 3) {
          videos.push({title: 'Stream #1', url})
        }
        if (videos.length) {
          handoff_videos(videos)
        }
      }
    })
  }
}
inject_next_tic()
