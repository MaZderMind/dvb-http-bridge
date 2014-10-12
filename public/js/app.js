$(function() {
	var
		$active = $('.active'),
		$loading = $('.loading'),
		$channels = $('.channels'),
		$channelTpl = $channels.find('.template').remove().removeClass('template'),
		baseurl = location.protocol+'//'+location.host;

	function playerprefix()
	{
		if(navigator.userAgent.match(/(iPod|iPhone|iPad)/))
			return 'goodplayer://';

		return '';
	}

	function buildUrl(channel)
	{
		return playerprefix()+baseurl+'/zap/'+escape(channel);
	}

	$('.active .join').attr('href', playerprefix()+baseurl+'/co-watch');

	$.get('/favs.json', function(favs) {
		$.each(favs, function(i, fav) {
			$channel = $channelTpl.clone();

			$channel.data('index', fav.index);
			$channel.find('.link').prop('href', buildUrl(fav.index));
			$channel.find('.icon').prop('src', 'images/channels/'+fav.icon).prop('alt', fav.name);
			$channel.find('.name').text(fav.name);

			$channel.appendTo($channels);
		})

		$loading.hide();
		$channels.show();
	});

	function updateStatus()
	{
		$.ajax({
			url: '/state',
			dataType: 'json',
			success: function(state) {
				if(state.active)
					$active.find('.name').text(state.channelname);

				$active.css('display',  !state.active ? 'none' : 'block')
				$channels.css('display', state.active ? 'none' : 'block')
			}
		});
	}

	updateStatus();
	setInterval(updateStatus, 1000*2);
});
