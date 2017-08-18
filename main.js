var fs = require("fs")

var canv_width = 1280
var canv_height = 905
var ratio = 0.031

yourworld.width = canv_width
yourworld.height = canv_height

var ctx = yourworld.getContext("2d")
ctx.font = Math.ceil(16 * ratio) + "px 'Courier New'"

function get_position_from_pixels(pix_x, pix_y) {
	pix_x -= Math.floor(canv_width / 2)
	pix_y -= Math.floor(canv_height / 2)
	
	pix_x /= (160 * ratio)
	pix_y /= (144 * ratio)
	
	return [Math.floor(pix_x), Math.floor(pix_y)]
}
var top_left = get_position_from_pixels(0, 0)
var bottom_right = get_position_from_pixels(canv_width - 1, canv_height - 1)

var startX = top_left[0]
var startY = top_left[1]
var endX = bottom_right[0]
var endY = bottom_right[1]

var readStream = fs.createReadStream("./logged.log", "utf8")
var threshold = 0
var tile_buffer = ""
var string_zone = false
var escape_zone = false

readStream.on("data", function(chunk) {
	var chk_called = false
	for(var i = 0; i < chunk.length; i++) {
		var chr = chunk.charAt(i)
		tile_buffer += chr
		if(!escape_zone) {
			if(chr === "\"" && !string_zone) {
				string_zone = true
			} else if(chr === "\"" && string_zone) {
				string_zone = false
			}
			
			if(chr === "\\" && string_zone) {
				escape_zone = true
			}
			
			if(chr === "[" && !string_zone) {
				threshold++
			}
			
			if(chr === "]" && !string_zone) {
				threshold--
				if(threshold === 0) {
					draw_chunk(tile_buffer)
					chk_called = true
					tile_buffer = ""
					string_zone = false
					escape_zone = false
					threshold = 0
				}
			}
		} else {
			escape_zone = false
		}
	}
	if(chk_called && continue_fc) {
		continue_fc = false
		next_data(continue_call, true)
	}
})

readStream.on("close", function() {
	console.log("DONE")
	nextdata_btn.disabled = true
	nextdata_btn.innerText = "Complete"
	nextdata_btn.style.fontWeight = "bold"
})

// from Mozilla Developer Network
function fixedCharAt(str, idx) {
    var ret = '';
    str += '';
    var end = str.length;
    var surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
    while ((surrogatePairs.exec(str)) !== null) {
        var li = surrogatePairs.lastIndex;
        if (li - 2 < idx) {
            idx++;
        } else {
            break;
        }
    }
    if (idx >= end || idx < 0) {
        return '';
    }
    ret += str.charAt(idx);
    if (/[\uD800-\uDBFF]/.test(ret) && /[\uDC00-\uDFFF]/.test(str.charAt(idx + 1))) {
        ret += str.charAt(idx + 1);
    }
    return ret;
}

var current_data = []
var data_pos = 0
var continue_fc = false
var continue_call

function draw_chunk(data) {
	current_data.push(JSON.parse(JSON.parse(data)[0]))
	readStream.pause()
}

var disabled = false
function next_data(callback, bypass) {
	if(!bypass) if(disabled) return
	disabled = true
	while(true) {
		var current = current_data[data_pos]
		if(data_pos >= current_data.length) {
			current_data = []
			data_pos = 0
			readStream.resume()
			continue_fc = true
			continue_call = callback
			break
		}
		data_pos++
		if(current.kind == "tileUpdate") {
			var contains = false
			for(i in current.tiles) {
				var spl = i.split(",")
				spl = [parseInt(spl[0]), parseInt(spl[1])]
				if(spl[0] >= startY && spl[0] <= endY) {
					if(spl[1] >= startX && spl[1] <= endX) {
						contains = true
						break
					}
				}
			}
			if(contains) {
				processTileGroup(current.tiles)
				//console.log("PROC.")
				disabled = false
				if(typeof callback === "function") {
					callback()
					callback = void 0
				}
				break
			}
		}
	}
}

nextdata_btn.onclick = do_next

function do_next() {
	next_data(function() {
		//setTimeout(do_next)
		do_next()
	})
}

function drawTile(tileX, tileY, content) {
	var wd = Math.floor(canv_width / 2)
	var hd = Math.floor(canv_height / 2)
	
	var xp = (tileX * 160) * ratio + wd
	var yp = (tileY * 144) * ratio + hd
	
	ctx.fillStyle = "#FFFFFF"
	ctx.fillRect(xp, yp, 160 * ratio, 144 * ratio)
	ctx.fillStyle = "#000000"
	if(tileY >= startY && tileY <= endY) {
		if(tileX >= startX && tileX <= endX) {
			for(var y = 0; y < 8; y++) {
				for(var x = 0; x < 16; x++) {
					var chr = fixedCharAt(content, y * 16 + x)
					ctx.fillText(chr, x * 10 * ratio + xp, (y * 18 * ratio + 13 * ratio) + yp)
				}
			}
		}
	}
}

function processTileGroup(tiles) {
	for(i in tiles) {
		var con = tiles[i]
		if(con === null) {
			con = " ".repeat(128)
		} else {
			con = con.content
		}
		var pos = i.split(",")
		pos = [parseInt(pos[0]), parseInt(pos[1])]
		drawTile(pos[1], pos[0], con)
	}
}