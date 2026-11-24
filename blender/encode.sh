cd "$(dirname "$0")"; S=$PWD/out
O=$(cd ../app/public/media/stage && pwd)
cd ../app && S=$S O=$O node --input-type=module -e '
import sharp from "sharp"; import fs from "fs"; const {S,O}=process.env;
const w=(a,b,W,q=82)=>fs.existsSync(`${S}/${a}.png`)&&sharp(`${S}/${a}.png`).resize(W).webp({quality:q,effort:6}).toFile(`${O}/${b}.webp`);
for (const j of ["wall","lit","map","map-lit"]) await w(j,j,2400);
await w("map-tall","map-tall",900);
for (const s of ["dtv","ltr","privilege","visa-exempt","retirement"]) { await w("detail-"+s,s,2400); await w("tall-"+s,"tall-"+s,900,80); }
await sharp(`${S}/wall.png`).extract({left:700,top:20,width:1000,height:220}).resize(1800).blur(2).modulate({brightness:0.9}).webp({quality:72}).toFile(`${O}/plaster.webp`);
'
clip() { n=$(ls $S/$1-0*.png 2>/dev/null | wc -l); [ $n -ge $3 ] || return
 ffmpeg -v error -y -framerate 30 -i $S/$1-%03d.png -c:v libx264 -preset veryslow -crf 23 -pix_fmt yuv420p -an -movflags +faststart $O/$2-in.mp4
 ffmpeg -v error -y -framerate 36 -i $S/$1-%03d.png -vf reverse -c:v libx264 -preset veryslow -crf 23 -pix_fmt yuv420p -an -movflags +faststart $O/$2-out.mp4; }
for s in dtv ltr privilege visa-exempt retirement; do clip $s $s 40; done
for s in bangkok chiang-mai phuket; do clip map-$s map-$s 34; done
ls -la $O; du -sh $O
