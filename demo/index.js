import { FlvDemuxer } from 'flv-demuxer.js';

const url = document.querySelector('.url');
const playBtn = document.querySelector('.playBtn');
const flvDemuxer = new FlvDemuxer();

playBtn.addEventListener(
  'click',
  () => {
    fetch(url.value).then(res => {
      const reader = res.body.getReader();

      flvDemuxer.on('data', data => {
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
