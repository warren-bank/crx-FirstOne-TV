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

    document.head.innerHTML = '<style>body{background-color: #f0f0f0; font-family: Helvetica,Arial,sans-serif; font-size: 16px; color: #666;} ul li{line-height: 1.5em;} ul li > div{margin-left: 1.25em;} a{color: rgb(17, 85, 204); text-decoration: none;}</style>'
    document.body.innerHTML = ''
  }

  display_links = function(links, $target) {
    // links = [{title, subtitle, url}]

    $target = $target || $(document.body).css('margin', '20px')

    var $ul = $('<ul></ul>').appendTo($target)
    links.forEach(({title, subtitle, url}) => {
      let $li, $a, $div
      $li = $('<li></li>')
        .appendTo($ul)
      $a = $('<a></a>')
        .text(title)
        .attr('href', url)
        .appendTo($li)

      if (subtitle) {
        $div = $('<div></div>')
          .text(subtitle)
          .appendTo($li)
      }
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
    .appendTo(document.body)

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
          if (url) videos.push({title, url})
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
        let channel = $img.first().attr('alt')
        let program = ($img.length > 1) ? $img.eq(1).attr('alt') : ''
        let url     = $a.first().attr('href')
        if (channel && url && (url !== '/Register-Login')) {
          url = 'https://www.firstonetv.net' + url
          links.push({title: channel, subtitle: program, url})
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
  document.addEventListener("DOMContentLoaded", function(event) {
    inject_function(payload)
  })
}

var inject_next_tic = function() {
  if (document.head === null) {
    setTimeout(inject_next_tic, 0)
  }
  else {
    inject_function(function(){
      var update_global_function = function() {
        if (typeof window.checkIfCanPlay !== 'function') {
          setTimeout(update_global_function, 10)
        }
        else {
          window.checkIfCanPlay = function(url, json) {
            var videos = []

            var handoff_videos = function(videos) {
              if (typeof window.display_videos !== 'function') {
                setTimeout(() => handoff_videos(videos), 10)
              }
              else {
                window.initialize_page_content()
                window.display_videos(videos)
              }
            }

            if (json && (!url || url.length < 3)) {
              try {
                json = JSON.parse(json)

                jQuery.each(json, function(title, url){
                  if (url) videos.push({title, url})
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
        }
      }
      update_global_function()
    })
  }
}
inject_next_tic()
