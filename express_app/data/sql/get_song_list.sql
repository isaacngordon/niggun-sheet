SELECT s.song_id AS "id",
s.song_title_en AS "search_title",
s.song_title_he AS "title",
COALESCE(a.artist_name, 'Uknown Artist') AS "artist",
COALESCE(l.lyric_text_he, 'Lyrics not Available') AS "lyrics",
NULL AS "drive",
yl.links AS "youtube"
FROM songs s 
LEFT JOIN artists a ON a.artist_id = s.artist_id 
LEFT JOIN lyrics l ON l.song_id  = s.song_id 
LEFT JOIN (
	SELECT song_id, group_concat(link_url, ' ') AS links 
	FROM links 
	WHERE link_type = 'youtube'
	GROUP BY song_id
) yl ON yl.song_id = s.song_id 
ORDER BY s.song_id ;