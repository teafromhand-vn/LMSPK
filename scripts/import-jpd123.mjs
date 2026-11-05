import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const source = 'D:/Project/source-importer2/text';
const id = '1UepauW8YimdhsUmhxCm7YUMCFZpQmz9MR_EYBmC2Q2U';
const definitions = [
  ['FA25 - RE - MC', 'C D ? B B C C B C D C B A C ? B B A ? ? D A B A A ? C A A ?', [
    '来日 đọc là らいにち: đến Nhật.', 'Mô tả thời tiết chung vào tháng 1, không cần trợ từ (X).', 'A và D đều hỏi khoảng thời gian: どのくらい / どれくらい.', 'しお là muối, cho vào súp.', '買います: mua.', '聞きます: nghe.', 'どこか: một nơi nào đó; không phải câu hỏi với か cuối câu.', 'コップ: cốc; あらいます: rửa.', 'ルームメイト: bạn cùng phòng, nấu cùng ai dùng と.', 'Hai vé dùng にまい (二枚).', '小さい đọc ちいさい.', '前日 đọc ぜんじつ, ngày hôm trước; câu ngữ cảnh hơi bất thường.', 'もうありません: không còn nữa.', 'Hỏi cảm nhận quá khứ: どうでしたか.', 'Bản chép dư が sau chỗ trống đầu. Dự kiến A nếu sửa thành ハノイに おおきい きょうかいが あります; cần đối chiếu ảnh.', 'Quá khứ của いい là よかった.', 'ともだちと やくそくがある: có hẹn với bạn.', '人物 đọc じんぶつ.', 'A và B đều hợp lệ: Tokyo に/へ, mục đích 撮りに行く.', 'A/C/D đều là dạng hợp lệ của ほしい; thiếu ngữ cảnh thời gian và phủ định để chọn duy nhất.', 'いいえ、まだです: chưa.', 'すみません、ちょっと…: từ chối lời mời lịch sự.', 'Người nhận khi cho mượn dùng に.', 'いつ hỏi thời điểm trong năm.', '見学: tham quan, kiến tập.', '毎度（ ）をあらいます thiếu tân ngữ; không lựa chọn nào hoàn chỉnh câu. Cần ảnh gốc.', 'どこか: một nơi nào đó.', 'Phủ định quá khứ: たのしくなかった.', '砂糖を入れます: cho đường vào.', 'Bản chép のみへ không khớp lựa chọn. Nếu gốc là うみへ thì C (みずぎ: đồ bơi); chưa sửa khi thiếu ảnh.'
  ]],
  ['SP26 - RE', 'A A A A ? A C B C D B ? B D A A B A A B D C B B B B C A A B', [
    '東 đọc ひがし: phía đông; câu kiểm tra cách đọc, không kiểm tra địa lý.', 'お寺 đọc おてら: chùa.', '行きます đọc いきます.', 'こんげつ viết 今月.', 'A và C trùng 今年, đều đọc ことし; không thể chọn duy nhất.', 'おおきい viết 大きい.', '窓を開けてください: hãy mở cửa sổ.', 'どのくらい hỏi thời lượng, trả lời khoảng 6 giờ.', 'デパート: trung tâm thương mại để mua túi.', 'にまい: hai tấm/vé.', 'が nối hai ý tương phản: nhỏ nhưng đông người.', 'しましょうか / しませんか / しますか đều có thể dùng tùy ý định hội thoại; thiếu câu đáp để xác định duy nhất.', '私のまちに大きいこうえんがあります: trong thành phố tôi có công viên lớn.', 'Phủ định hiện tại của tính từ な: にぎやかじゃありません; A là phủ định quá khứ.', 'ひとりで: một mình.', '北海道 là địa điểm trượt tuyết phù hợp.', 'Làm thêm ở Nhật nên không về nước.', 'Không thích thịt nên không ăn.', 'Phủ định quá khứ: たのしくなかった.', '私のまちは1月とてもさむいです: thành phố tôi rất lạnh vào tháng 1.', 'てんきがわるい: thời tiết xấu.', '駅から近い: gần ga.', 'パン là bánh mì; ba từ còn lại là đồ uống.', 'きょうかい (教会): nhà thờ.', 'にぎやか: nhộn nhịp.', 'ビル là tòa nhà; các từ còn lại là phương tiện.', '山に登りました: đã leo núi.', 'お弁当を食べました: đã ăn cơm hộp.', 'Đoạn văn nói けしきがとてもきれいでした: phong cảnh rất đẹp.', '何を買いますか: mua gì?'
  ]],
  ['SU26 - FE', 'A C A A C A B B ? ? D A A D C D C A A D B C B B B D B C A A', [
    '半年 đọc はんとし: nửa năm.', '毎月 đọc まいつき (cũng có まいげつ, không nằm trong lựa chọn).', '休日 đọc きゅうじつ: ngày nghỉ.', 'ごぜん viết 午前: buổi sáng.', 'くに viết 国: đất nước.', 'りょうり viết 料理: món ăn/nấu ăn.', '弾く → 弾いて; ギターをひいています: đang chơi guitar.', '先週 là tuần trước, dùng いきました.', 'A いちばん phù hợp nghĩa thích nhất, nhưng D とても (và C たいへん) cũng có thể bổ nghĩa すき; chưa đủ điều kiện chọn duy nhất.', 'D そして phù hợp nối hai tính chất; B それから cũng có nghĩa thêm vào đó. Cần đáp án gốc hoặc yêu cầu rõ hơn.', 'Người đang ở trong nhà: います.', 'もうありません: không còn nữa.', 'Đồng ý lời mời: しましょう, cùng làm nhé.', 'Thân động từ + 方: つくりかた, cách làm.', 'けさ và おきました chỉ quá khứ: 何も食べませんでした, đã không ăn gì.', 'Hỏi hiện tại đang ở đâu: đang nói chuyện, はなしています.', 'どこ hỏi địa điểm, câu trả lời Hokkaido.', 'どこかへ行きましたか: đã đi đâu đó không?', 'すこしあつい: hơi nóng; あまり thường đi với phủ định.', '電話をかけます: gọi điện.', 'Cho muối しお vào súp.', 'Không có đồ bơi みずぎ nên không đi biển.', 'ひま: rảnh; vì mai rảnh nên muốn ngủ đến trưa.', 'コップをあらいます: rửa cốc.', 'なにも + phủ định: không muốn gì cả.', 'かぞくと: cùng gia đình.', 'どこか行きますか: có đi đâu không? Hợp với câu trả lời はい.', '山に登りました: leo núi. Giữ nguyên ghi chú OCR ở đoạn văn.', 'お弁当を食べました: ăn cơm hộp. Giữ nguyên ghi chú OCR ở đoạn văn.', 'Đoạn văn ghi phong cảnh rất đẹp. Giữ nguyên ghi chú OCR ở đoạn văn.'
  ]],
  ['SU26 - RE', 'C D C A C C A A ? D B B D B A D ? C A D C D A D C C B C A A', [
    '来日 đọc らいにち.', '今日 đọc きょう: hôm nay.', '小さい đọc ちいさい.', 'けんがく viết 見学.', 'おとこ viết 男.', 'らいしゅう viết 来週: tuần sau.', '撮ります bỏ ます + に行きます: đi chụp ảnh.', 'きれい là tính từ な, bổ nghĩa ところ dùng きれいな.', 'A là lời đề xuất phù hợp, nhưng D cũng có thể là lời đáp hội thoại. Thiếu ngữ cảnh/đáp án gốc để chọn chắc chắn.', 'にまい: hai vé.', 'どうして hỏi lý do, đáp 高かったですから: vì đắt.', '書く → 書いて; hãy viết tên.', 'AはBより: A so với B; xe buýt rẻ hơn tàu.', 'いい → よかった: đã tốt.', 'どちらも: cả hai, đều thích tiếng Anh và Nhật.', '切る → 切って: hãy cắt táo.', 'A どのくらい và D どれくらい đều hỏi khoảng thời gian.', 'So sánh hai ngôn ngữ dùng どちら.', 'ジャズのコンサート: hòa nhạc jazz.', 'きもちがいい: dễ chịu, nói về suối nước nóng.', 'Nấu cùng bạn cùng phòng: ルームメイト.', 'Trong các món ăn (たべもの), thích tonkatsu nhất.', 'おさらをあらいます: rửa đĩa.', '山に登ります: leo núi.', 'Sự kiện diễn ra tại đâu dùng で, khác vị trí tồn tại vật dùng に.', 'どこか: một nơi nào đó.', 'へやのなかに: ở trong phòng; います dùng に.', 'Chuyện đã xảy ra, ăn tại nhà hàng: しょくじしました.', 'あまり + phủ định quá khứ: おいしくなかったです.', 'Đoạn văn nói đã đi Shinjuku mua giày; đi Chủ nhật, đông người và tuần sau đi với bạn.'
  ]]
];
const headers = {
  Subjects: ['id','courseId','name','description','semester','category','color'],
  Chapters: ['subjectId','id','name','description'],
  Collections: ['id','subjectId','chapterId','kind','name','description','category'],
  Questions: ['collectionId','id','type','prompt','answer','choices','correctIndices','explanation','image','imageAlt','backImage','backImageAlt'],
  Documents: ['id','subjectId','chapterId','name','description','category','format','file','detail'],
  ImportReview: ['collectionId','id','sourceFile','questionNumber','prompt','choices','reason','status']
};
const rows = Object.fromEntries(Object.keys(headers).map(k => [k, []]));
rows.Subjects.push(['jpd123','JPD123','Tiếng Nhật — JPD123','Ôn tập từ vựng, ngữ pháp và đọc hiểu tiếng Nhật.',4,'Ngoại ngữ','purple']);
for (const [suffix, letters, explanations] of definitions) {
  const file = fs.readdirSync(source).find(f => f.endsWith(`JPD123 - ${suffix}.txt`));
  const blocks = fs.readFileSync(path.join(source,file),'utf8').trim().split(/^---\s*$/m).map(s=>s.trim()).filter(Boolean);
  const answers = letters.split(' ');
  if (blocks.length !== 30 || answers.length !== 30 || explanations.length !== 30) throw Error(`Length mismatch ${suffix}`);
  const collectionId = `jpd123-${suffix.toLowerCase().replaceAll(' - ','-')}`;
  rows.Collections.push([collectionId,'jpd123','','tests',`JPD123 — ${suffix}`,'Lời giải tham khảo do AI biên soạn, không phải đáp án chính thức. Câu chưa xác định được lưu tại ImportReview.','Tiếng Nhật']);
  blocks.forEach((block,i)=>{
    const match = block.match(/^([\s\S]*?)^A\.\s*(.*?)\r?\nB\.\s*(.*?)\r?\nC\.\s*(.*?)\r?\nD\.\s*([\s\S]*)$/m);
    if (!match) throw Error(`Parse failed ${file} ${i+1}`);
    const prompt = match[1].trim(), choices = JSON.stringify(match.slice(2).map(s=>s.trim())), qid=`q${String(i+1).padStart(2,'0')}`;
    if(answers[i]==='?') rows.ImportReview.push([collectionId,qid,file,i+1,prompt,choices,explanations[i],'needs-review']);
    else rows.Questions.push([collectionId,qid,'multiple_choice',prompt,'',choices,JSON.stringify(['ABCD'.indexOf(answers[i])]),`Lời giải tham khảo (AI): ${explanations[i]}`,'','','','']);
  });
}
const credential = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE,'.google-credentials/service-account.json'),'utf8'));
const b = x=>Buffer.from(JSON.stringify(x)).toString('base64url'), now=Math.floor(Date.now()/1000);
const unsigned=b({alg:'RS256',typ:'JWT'})+'.'+b({iss:credential.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
const assertion=unsigned+'.'+crypto.sign('RSA-SHA256',Buffer.from(unsigned),credential.private_key).toString('base64url');
const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
const token=await tr.json(); if(!tr.ok)throw Error('Authentication failed');
const api=async(endpoint,body)=>{const r=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${endpoint}`,{headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{})}); const data=await r.json();if(!r.ok)throw Error(JSON.stringify(data));return data;};
const meta=await api('?fields=sheets.properties');
const existing=await api('/values:batchGet?'+Object.keys(headers).filter(s=>meta.sheets.some(x=>x.properties.title===s)).map(s=>'ranges='+encodeURIComponent(`${s}!A:Z`)).join('&'));
const backupDir=path.join(process.env.LOCALAPPDATA,'Temp/opencode');
fs.writeFileSync(path.join(backupDir,`jpd123-before-${Date.now()}.json`),JSON.stringify(existing,null,2));
const updates=[]; const summary={};
for(const [sheet,columns] of Object.entries(headers)){
  const old=existing.valueRanges.find(x=>x.range.startsWith(sheet+'!')||x.range.startsWith(`'${sheet}'!`))?.values??[];
  if(old.length && columns.some(c=>!old[0].includes(c))) throw Error(`Unexpected headers ${sheet}`);
  const order=old[0]??columns;
  const keyFields=sheet==='Questions'||sheet==='ImportReview'?['collectionId','id']:['id'];
  const key=(r,h)=>keyFields.map(k=>String(r[h.indexOf(k)]??'')).join('|');
  const known=new Set(old.slice(1).map(r=>key(r,order)));
  const fresh=rows[sheet].filter(r=>!known.has(key(r,columns))).map(r=>order.map(c=>r[columns.indexOf(c)]??''));
  if(sheet==='Subjects' && known.has('jpd123')) {const found=old.findIndex((r,i)=>i>0&&r[order.indexOf('id')]==='jpd123');if(String(old[found][order.indexOf('semester')])!=='4')throw Error('Existing JPD123 semester differs');}
  if(!old.length||fresh.length)updates.push({range:`'${sheet}'!A${old.length+1}`,values:old.length?fresh:[order,...fresh]});
  summary[sheet]=fresh.length;
}
console.log(JSON.stringify({summary,mode:process.argv.includes('--apply')?'apply':'dry-run'},null,2));
fs.writeFileSync(path.join(backupDir,'jpd123-import-preview.json'),JSON.stringify({headers,rows},null,2));
if(process.argv.includes('--apply')){
  const missing=Object.keys(headers).filter(s=>!meta.sheets.some(x=>x.properties.title===s));
  if(missing.length)await api(':batchUpdate',{requests:missing.map(title=>({addSheet:{properties:{title}}}))});
  const result=await api('/values:batchUpdate',{valueInputOption:'RAW',data:updates});
  console.log(JSON.stringify({updatedRows:result.totalUpdatedRows,updatedCells:result.totalUpdatedCells}));
  const check=await api('/values:batchGet?'+['Subjects','Collections','Questions','ImportReview'].map(s=>'ranges='+s+'!A:Z').join('&'));
  for(const v of check.valueRanges)console.log(v.range+': '+(v.values.length-1)+' records');
}
