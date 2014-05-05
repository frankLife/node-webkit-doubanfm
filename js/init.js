//TODO:
var request = require('request');
var _ = require('underscore');
var $c = require('cheerio');
$(function(){

//获取对应文章
function getArticle(album){
  if(album == undefined) {
    console.log('unknown album');
    return;
  }
  request.get('http://music.douban.com'+album,{
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.116 Safari/537.36'
  }
},function(err,res,body){
  var body =  $c(body);
  var listItems = $c(body.find('#wt_0 .ctsh'));
  var _url = null;
  if(listItems.length > 0) { //存在评论
        if(listItems.find('a.pl').length > 0) {   //有被回复过的评论(点击链接则会在请求中返回完整评论)
          for(var i = 0,len = listItems.length;i<len;i++) {
            if($c(listItems[i]).find('a.pl').length > 0){
              _url = $c(listItems[i]).find('a.pl').attr('href');
              break;
            }
          }
        console.log(_url);
        request.get(_url,{
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.116 Safari/537.36'
          }
        },function(err,res,body){
          if(err) {
            console.log('valid url or obj');
            return;
          }
          place(body);
        });
      }else { //没有被回复过的评论
        if(listItems.find('.pl.ll.obss').siblings('.review-short').next().length > 0 ) {  //存在可展开完整的评论(默认都是可展开)
          var ajax_url = null;
          //默认取第一项的内容
          ajax_url = 'http://music.douban.com/j/review/'+$c(listItems[0]).find('.rr').attr('id').substring(3)+'/fullinfo?show_works=False';
          //'http://music.douban.com/j/review/2079197/fullinfo?show_works=False'
          console.log(ajax_url);
          request.get(ajax_url,{
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.116 Safari/537.36'
            }
          },function(err,res,body){
            var body = decodeURIComponent(unescape(JSON.parse(res.body).html));
            var result = body.match(/^([\s\S]*)<div class="review-panel"/);
            var wrap = $c(listItems[0]);
            var user = wrap.find('.starb a').text();
            var title = wrap.find('.rr').next().text();
            var cnt = result[1];
            //构造内容节点
            var custom = '<div><div id="cus-cnt">'+cnt+'</div><div id="cus-tle">'+title+'</div><div id="cus-user">'+user+'</div></div>'
            console.log(custom);
            place(custom,'custom')
          });
        }else { //没有存在可展开的评论
          place($c(listItems[0]).find('.pl.ll.obss').siblings('.review-short').html()+'未展开','one');
        }
      }
  }else {
    place('没有评论','none');
  }
});
  //将文章各部分内容放置到对应节点位置
  function place(html,type){
    if(type === 'none') {
      console.log(html);
      $('#comment').find(':not(p)').html('');
      $('#comment p').html(html);
      $('#comment').animate({'opacity':1},1000);
      return;
    }
    if(type == "custom") {
      var body = $c(html);
      $('#comment h3').text(body.find('#cus-tle').text());
      $('#comment h4').text(body.find('#cus-user').text());
      $('#comment p').text(body.find('#cus-cnt').text());
      $('#comment').animate({'opacity':1},1000);
      return;
    }
    var body = $c(html)
    $('#comment h3').text(body.find('#content h1').text());
    $('#comment h4').text($c(body.find('#content .piir a')[0]).find('span').text());
    $('#comment p').html(body.find('#link-report').html());
    $('#comment').animate({'opacity':1},1000);
  }
}
function likeSong(sid,channel,isLike){
  // console.log('sid:' + sid);
  // console.log('channel: '+channel);
  // console.log('isLike:'+ isLike);
  // console.dir(Login.self);
  var url = 'http://www.douban.com/j/app/radio/people';
  url += '?';
  var params = {
    app_name: 'radio_desktop_win',
    version: 100,
    channel: channel,
    type: isLike?'r':'u',
    sid: parseInt(sid),
    user_id: Login.self['user_id'],
    expire: Login.self['expire'],
    token: Login.self['token']
  };
  for(var item in params) {
    if(params[item] === null ) {
      continue;
    }
    url += item + '=' + params[item].toString() +'&';
  }
  url += url.substring(0,url.length-1);
  console.log('url: '+url);
  request.get(url,{
     headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'douban.fm' //必须设置这个User-Agent
      }
    },function(err,res,body) {
      if(err) {
        console.log('like error')
      }
      console.log(JSON.parse(body));
    });
}
bindPlay.refresh = function(){
  var pre = bindPlay.pre;
  if(bindPlay.pre == null) {
    return;
  }
  var playing = {
    'audio': pre.find('audio')[0],
    'a_btn': pre.find('.play-btn'),
    'img': pre.find('.list-pic')
  };
  playing['audio'].pause();
  playing['audio'].currentTime = 0;
  playing['a_btn'].data('status',false).text('播放');
  playing['img'].removeClass('playing_pic');
}

bindPlay.isNeedTurn = true;  //在点击喜欢的时候防止登录跳转
bindPlay.pre = null;
function bindPlay(){
  var btnWrap = $('#songList');
  var isCommented = false;
  //绑定自动播放下一首(加载新元素后解绑之后重新绑定是因为ended事件没有实现事件冒泡)
  $('#songList audio').off('ended');
  $('#songList audio').on('ended',function(){
    if($(this).parents('li').next().index() >= $('#songList li').length-3) {   //实现自动加载,避免放到最后一曲的
      console.log('yeah');
      getSongList(bindGetSong.curChannel,null,null,null,true);
    }
    $(this).parents('li').next().find('.play-btn').trigger('click');
  })
  if(getSongList.isBind) {
    return;
  }
  getSongList.isBind = true;
  //绑定点赞
  //点赞标志初始化
  //btnWrap.find('.list-like').data('isLike',false);
  btnWrap.on('click','.list-like',function(){
    var parentLi = $(this).parents('li');
    if(!Login.isLogin) {
      bindPlay.isNeedTurn = false;
      $('.trigger-login').hide();
      $('#loginBox').addClass('on');
    }else{
      if(parentLi.data('sid')){
        likeSong(parentLi.data('sid'),bindGetSong.curChannel,!parentLi.data('isLike'));
        if(!parentLi.data('isLike')) {
          $(this).attr('src','./img/list_like_on.png');
        }else{
          $(this).attr('src','./img/list_like_off.png');
        }
        parentLi.data('isLike',!parentLi.data('isLike'));
      }
    }
  });
  //播放列表状态值初始化
  btnWrap.find('.play-btn').data('status',false);
  btnWrap.on('click','.play-btn',function(){
    var $this = $(this);
    if($this.data('status')) {
      $this.text('播放').siblings('audio')[0].pause();
      $this.parent().siblings('img').addClass('pauseing_pic');
    }else {
      $this.text('暂停').siblings('audio')[0].play();
      // $this.siblings('audio').on('ended',function(){
      //   $this.parents('.list-cnt').siblings('img').removeClass('playing_pic pauseing_pic');
      // });
      if(bindPlay.pre != null && bindPlay.pre[0] != $this.parents('li')[0]) {
        isCommented = false;
        bindPlay.pre.find('img').removeClass('playing_pic pauseing_pic');
        bindPlay.pre.find('.play-btn').data('status',false).text('播放');
        bindPlay.pre.find('audio')[0].pause();
      }
      bindPlay.pre = $this.parents('li');
      if($this.parent().siblings('img').hasClass('pauseing_pic')) {
        $this.parent().siblings('img').removeClass('pauseing_pic');
      }else {
        $this.parent().siblings('img').addClass('playing_pic');
      }

      //获得歌曲对应评论(不能更换加载)
      if(!isCommented) {
        $('#comment').css('opacity',0);
        if($this.parents('li').data('album') != undefined) {
          console.log($this.parents('li').data('album'));
          getArticle($this.parents('li').data('album'));
        }else {
          alert($this.parents('li').data('album'));
          console.log($this.parents('li').data('album'));
        }
        isCommented = true;
      }
    }
    $this.data('status',!$this.data('status'));
  });
}
bindGetSong.isLoaded = true;  //控制滚动加载时可能会出现的多次请求
bindGetSong.curChannel = null;
function bindGetSong(){
  var channels = $('#channel');
  bindGetSong.curChannel = null;
  channels.on('click','li',function(){
    if(bindGetSong.curChannel&&bindGetSong.curChannel==$(this).attr('channel_id')) {
      return;
    }
    $('#songList').children().remove();
    getSongList( bindGetSong.curChannel = $(this).attr('channel_id'));
  });
  $('#songList').on('mousewheel',function(){
    if($(this).scrollTop()+document.documentElement.clientHeight > $(this).height() &&
        bindGetSong.curChannel != null) {
      if(bindGetSong.isLoaded) {
        bindGetSong.isLoaded = false;
        getSongList(bindGetSong.curChannel,null,null,null,true);
      }

    }
  });
}

getChannel();
function getChannel() {
  var data = null;
  request.get('http://www.douban.com/j/app/radio/channels',
  {
    headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'douban.fm' //必须设置这个User-Agent
    }
  },function(err,res,body) {
    //貌似这个回调会在函数结束后,把所有用到的变量全部手动消除..所以body传不出去
    if(err) {
      console.log('get channels err');
      return;
    }
    body = JSON.parse(body);
    var _resInfo = _.clone(body).channels;
    var listWrap = $('#channel');
    for(var i = 0,len = _resInfo.length;i<len;i++) {
      listWrap.append('<li channel_id="'+ _resInfo[i]['channel_id'] +'">' + _resInfo[i]['name'] + '</li>')
    }
    bindGetSong();
  });
}
getSongList.isBind = false;//是否绑定歌曲播放等事件
function getSongList(channel,user_id,expire,token,isScroll) {
  var url = 'http://www.douban.com/j/app/radio/people';
  url += '?';
  var params = {
    app_name: 'radio_desktop_win',
    version: 100,
    channel: channel || null,
    type: 'n',
    user_id: user_id || null,
    expire: expire || null,
    token: token || null
  };
  for(var item in params) {
    if(params[item] === null ) {
      continue;
    }
    url += item + '=' + params[item].toString() +'&';
  }
  url += url.substring(0,url.length-1);
  request.get(url,{
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'douban.fm' //必须设置这个User-Agent
      }
  },function(err,res,body) {
    if(!isScroll) {
      $('#songList').css('opacity',0);
    }
     if(err) {
        console.log('get channels err');
        return;
      }
      body = JSON.parse(body);
      var _resInfo = _.clone(body);

      var songs = _resInfo['song']
      var songList = $('#songList');

      for(var i = 0,len = songs.length;i<len;i++ ) {
        var songItem = songs[i];
        var isLike = songItem['like'] == 0?false:true;

        console.log(songItem['like']);
        var src = isLike?'./img/list_like_on.png':'./img/list_like_off.png';
        songList.append(
          $('<li class="fn-clear">'+
              '<img class="list-pic" src="'+songItem['picture']+'" />'+
              '<div class="list-cnt">'+
                '<h2>'+songItem['title']+'</h2>'+
                '<h3>'+songItem['artist']+'</h3>'+
                '<a class="play-btn" href="###">播放</a>'+
                '<img class="list-like" src="'+src+'" />'+
                '<audio preload="metadata" src="'+songItem['url']+'"></audio>'+
              '</div>'+
          '</li>').data('album',songItem['album']).data('sid',songItem['sid']).data('isLike',isLike)
          );
      }
      if(!isScroll) {
        $('#songList').animate({'opacity':1},1000);
      }
      bindGetSong.isLoaded = true;
      bindPlay();

  });
}








 initTrigger();
  initTrigger.isShow = false;
  function initTrigger(){
    $('#topTrigger').on('mouseover','a',function(){
       if($(this).attr('class') == 'trigger-login') {
        $('#loginBox').addClass('on')
                      .one('mouseleave',function(){  //mouseout子元素会触发
                        $(this).removeClass('on');
                      });
       }else {
        $('#red').addClass('on');
        setTimeout(function(){
          $('#red').one('mouseleave',function(){
              $(this).removeClass('on');
           });
        },600);
       }
    });
  }
  initRed();
  initRed.isRed = false;
  function initRed(){
    //登录提交绑定
    $('.login-submit button').on('click',function(){
      var user = $('.login-user input').val();
      var pwd = $('.login-pwd input').val();
      Login(user,pwd);
    });
    //绑定红心按钮
    $('#red').on('click',function(){
      if(!Login.isLogin) {
        $('.trigger-login').hide();
        $('#loginBox').addClass('on');
      }else{
        if(initRed.isRed) {
          turnChannel();
          return;
        }else{
          turnRed();
        }
        $('#loginBox').addClass('on');
        // $('.trigger-login').show();
        $('#loginBox').one('mouseleave',function(){
          $(this).removeClass('on');
        });
      }
    });
  }

function getRedSongs(user_id,expire,token) {
  var url = 'http://www.douban.com/j/app/radio/people';
  url += '?';
  var params = {
    app_name: 'radio_desktop_win',
    version: 100,
    channel: -3,
    type: 'n',
    user_id: user_id,
    expire: expire,
    token: token
  };
  for(var item in params) {
    url += item + '=' + params[item].toString() +'&';
  }
  url += url.substring(0,url.length-1);
  request.get(url,{
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'douban.fm' //必须设置这个User-Agent
      }
  },function(err,res,body) {
     //$('#songList').css('opacity',0);
     if(err) {
        console.log('get channels err');
        return;
      }
      body = JSON.parse(body);
      var _resInfo = _.clone(body);
      var songs = _resInfo['song'];
      var songList = $('#myHeart');
      for(var i = 0,len = songs.length;i<len;i++ ) {
        var songItem = songs[i];
        songList.append(
          $('<li>'+
            '<img data-mp3 = "'+songItem['url']+'" class="my-song" src="'+songItem['picture']+'" />'+
            '<img class="play_btn" src="./img/play.png">'+
            '</li>')
          );
      }
      heartPlay();
  });
}
heartPlay.isBind = false;
function heartPlay(){
  if(heartPlay.isBind) {
    return;
  }
  heartPlay.isBind = true;
  var playOffset = $('#heartPlay img').offset();
  var preLi = $($('#myHeart li')[0]);
  var preClone = null;
  var count = 0;
  $('#myHeart').on('click','li',function(e){
    //播放中重复点击
    if($(this).find('.play_btn').hasClass('playing')) {
      if($('#heartPlay audio')[0].paused) {
        $(this).find('.play_btn').attr('src','./img/pause.png');
        $('#heartPlay audio')[0].play();
        $('#heartPlay img').removeClass('pauseing_pic');
        return;
      }else {
        $(this).find('.play_btn').attr('src','./img/play.png');
        $('#heartPlay audio')[0].pause();
        $('#heartPlay img').addClass('pauseing_pic');
        return;
      }
    }
    //清除之前点击过播放的音乐按钮状态
    preLi.find('.play_btn').attr('src','./img/play.png').removeClass('playing');
    var $this = $(this);
    var selfOffset = $this.offset();
    var $play = $this.find('.my-song').clone().appendTo('body').css({
                       'position':'absolute',
                       'z-index': 2,
                       'left': selfOffset.left,
                       'top': selfOffset.top,
                       'transition':'border-radius 1.5s'
                       })
                       .animate({
                        'left': playOffset.left,
                        'top': playOffset.top + $('body').scrollTop()
                       },1000,function(){
                          if(preClone != null) {
                            preClone.remove();
                          }
                          preClone = $play;
                          $play.addClass('heart-prepare');
                          setTimeout(function(){
                            $play.appendTo($('#heartPlay')).css({
                              'left': 0,
                              'top': 0
                            });
                            $('#heartPlay audio').attr('src',$play.attr('data-mp3'))[0].play();
                            $('#heartPlay audio').one('ended',function(){
                                                    if($this.next().index() >= $('#myHeart li').length-3) {
                                                      getRedSongs(Login.self['user_id'],Login.self['expire'],Login.self['token']);
                                                    }
                                                    $this.next().trigger('click');
                                                 });
                            $play.addClass('playing_pic');
                            $('#heartPlay .play_edg').addClass('playing_pic');
                          },1000);
                       });
    preLi = $this.find('.play_btn').attr('src','./img/pause.png').addClass('playing').end();

  });
  $('#heartPlay audio').on('play',function(){
      preLi.find('.play_btn').attr('src','./img/pause.png');
      $(this).siblings('img').removeClass('pauseing_pic');
  })
  .on('pause',function(){
      preLi.find('.play_btn').attr('src','./img/play.png');
      $(this).siblings('img').addClass('pauseing_pic');
   })
}
  Login.isLogin = false;
  Login.isLoad = true;
  Login.timeout = null;
  Login.self = {};
  function Login(email,password) {
    request.post('http://www.douban.com/j/app/login',{
      form: {
        app_name: 'radio_desktop_win',
        version: 100,
        email: email,
        password: password
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'douban.fm' //必须设置这个User-Agent
      }
    },function(err,res,body) {
      if(err) {
        console.log('request fail');
        return;
      }
      body = JSON.parse(body);
      if(body.r !== 0) {
        console.log('login fail');
        return;
      }
      var _resInfo = _.clone(body);
      $('.login-info').show().find('input').val(_resInfo['user_name']);
      $('#loginWrap').animate({
        'top': '-90px'
      },1000);
      //登录成功后还原trigger及登录框状态
      Login.isLogin = true;
      $('.trigger-login').show();
      $('#loginBox').one('mouseleave',function(){
        $(this).removeClass('on');
      });
      //做加载红心音乐前的整体样式处理
      if(bindPlay.isNeedTurn) {
        $('#heartPlay').show();
        $('#wrap').css({
          'overflow':'auto',
          'height': 'auto'
        });
        $('body').addClass('noScroll');
      }
      $('#red img').attr('src','./img/redheart_on.png');

      //存储用户登录信息用于实现自动加载
      Login.self = {
        'user_id': _resInfo['user_id'],
        'expire': _resInfo['expire'],
        'token': _resInfo['token']
      };
      //加载红心音乐
      getRedSongs(_resInfo['user_id'],_resInfo['expire'],_resInfo['token']);
      getRedSongs(_resInfo['user_id'],_resInfo['expire'],_resInfo['token']);
      setTimeout(function(){
        if(bindPlay.isNeedTurn) {
          turnRed();
        }else {
          bindPlay.isNeedTurn = true;
        }
      },1000); //给一个预加载的缓冲过度时间
      //绑定滚动加载
      $('body').on('mousewheel',function(){
        if($(this).scrollTop() + document.documentElement.clientHeight > $('#myHeart').height() - 100) {
          if(Login.isLoad) {
            getRedSongs(_resInfo['user_id'],_resInfo['expire'],_resInfo['token']);
            Login.isLoad = false;
          }
          clearTimeout(Login.timeout);
          Login.timeout = setTimeout(function(){
            Login.isLoad = true;
          },2000);
        }
      });
    });
  }

  function turnRed(){
    bindPlay.refresh();
    var channelsAudios =  $('#songList audio');
    for(var i=0,len = channelsAudios.length;i<len;i++) {
      channelsAudios[i].pause();
    }
    $('body').addClass('noScroll');
    $('#heartPlay').show();
    $('#wrap').css({
        'overflow':'auto',
        'height': 'auto'
      });
    $('#red img').attr('src','./img/redheart_on.png');
    $('#posWrap').animate({'top':'-656px'},1000,function(){
      $('#channelWrap').hide();
      $('#posWrap').css('top','0px');
      initRed.isRed = true;
    });
  }
  function turnChannel(){
    $('#channelWrap').css('height','0px').show().animate({'height':'656px'},1000);
    $('#heartPlay').hide();
    $('#heartPlay audio')[0].pause();
    $('body').removeClass('noScroll');
    $('#wrap').css({
      'overflow':'hidden',
      'height': '656px'
    });
    $('#red img').attr('src','./img/redheart_off.png');
    initRed.isRed = false;
  }






})

