import { FlvDemuxer } from 'flv-demuxer.js';

const url = document.querySelector('.url');
const output = document.querySelector('.output');
const playBtn = document.querySelector('.playBtn');
const stopBtn = document.querySelector('.stopBtn');

let textArr = [];
const flvDemuxer = new FlvDemuxer();

playBtn.addEventListener(
  'click',
  () => {
    fetch(url.value).then(res => {
      const reader = res.body.getReader();

      flvDemuxer.on('data', data => {
        textArr.unshift(JSON.stringify(data));
        console.log('有信息');
        while (textArr.length > 400) {
          // textArr.shift();
          textArr = [];
        }

        output.value = textArr.join('\n');

        console.log('🏃‍♀️ demuxing...', data);
      });

      flvDemuxer.on('done', () => {
        console.log('🤩 done!');
      });

      flvDemuxer.on('error', err => {
        console.log('😨 sth error in demuxer', err);
      });

      flvDemuxer.on('reconnect', () => {
        console.log('🤔 try to reconnect...');
      });

      flvDemuxer.read(reader);
    });
  },
  false
);

stopBtn.addEventListener('click', () => flvDemuxer.stop());
