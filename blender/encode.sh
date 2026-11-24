cd "$(dirname "$0")"; S=$PWD/out
O=$(cd ../app/public/media/stage && pwd)
cd ../app && S=$S O=$O node --input-type=module -e '
import sharp from "sharp"; import fs from "fs"; const {S,O}=process.env;
// the same lift as LIFT below, so stills and clips match
const lift=async(f)=>{const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});for(let i=0;i<data.length;i++)data[i]=Math.round(255*(data[i]/255)**0.85);return sharp(data,{raw:info})};
const w=async(a,b,W,q=82)=>fs.existsSync(`${S}/${a}.png`)&&(await lift(`${S}/${a}.png`)).resize(W).webp({quality:q,effort:6}).toFile(`${O}/${b}.webp`);
for (const j of ["wall","lit","map","map-lit"]) await w(j,j,2400);
await w("map-tall","map-tall",900);
for (const s of ["dtv","ltr","privilege","visa-exempt","retirement"]) { await w("detail-"+s,s,2400); await w("tall-"+s,"tall-"+s,900,80); }
await sharp(`${S}/wall.png`).extract({left:1820,top:60,width:560,height:150}).resize(1800).blur(6).modulate({brightness:1.05}).webp({quality:72}).toFile(`${O}/plaster.webp`);
'
LIFT="lutrgb=r='255*pow(val/255,0.85)':g='255*pow(val/255,0.85)':b='255*pow(val/255,0.85)'"
TAG="scale=out_color_matrix=bt709:out_range=tv"
X="-c:v libx264 -preset veryslow -crf 23 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -an -movflags +faststart"
clip() { n=$(ls $S/$1-0*.png 2>/dev/null | wc -l); [ $n -ge $3 ] || return
 ffmpeg -v error -y -framerate 30 -i $S/$1-%03d.png -vf "$LIFT,$TAG" $X $O/$2-in.mp4
 ffmpeg -v error -y -framerate 36 -i $S/$1-%03d.png -vf "reverse,$LIFT,$TAG" $X $O/$2-out.mp4; }
for s in dtv ltr privilege visa-exempt retirement; do clip $s $s 40; done
for s in bangkok chiang-mai phuket; do clip map-$s map-$s 34; done
ls -la $O; du -sh $O
