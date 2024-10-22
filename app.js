const fs = require("fs");
const { Kafka } = require('kafkajs');

//****** Kafka At least once ********
/*
- consumer จะรับ message มาแต่ละอัน อย่างน้อยอันละหนึ่งครั้ง
- ระบบจะพยายามส่งข้อมูลซ้ำหากไม่ได้รับการยืนยันว่าการส่งสำเร็จ (acknowledgment, commitOffsets) 
  ดังนั้นผู้รับข้อมูลอาจได้รับข้อมูลซ้ำหากระบบส่งซ้ำ
- เหมาะกับ ระบบการแจ้งเตือน, ประมวลผลธุรกรรม
*/ 

async function main() {
  // อ่าน config จากไฟล์
  const config = readConfig("client.properties");

  // ดึงค่า clientId, brokers, และการตั้งค่าด้าน security จาก config
  const kafka = new Kafka({
    clientId: config['client.id'],  // อ่าน clientId จาก config
    brokers: config['brokers'].split(','),  // แยก brokers เป็น array
    ssl: true,  // เปิดการเชื่อมต่อแบบ SSL
    sasl: {
      mechanism: config['sasl.mechanisms'],  // ระบุ mechanism (PLAIN ในกรณีนี้)
      username: config['sasl.username'],  // ระบุ username
      password: config['sasl.password'],  // ระบุ password
    },
  });

  const producer = kafka.producer({
    retry: { retries: 5 },
  });
  
  const consumer = kafka.consumer({ 
    groupId: 'nodejs-group-1' 
  });

  const topic = "orders.transactions.created";

  // ฟังก์ชันสำหรับส่งข้อความ (Producer)
  async function produceMessage() {
    const now = new Date().toISOString();
    const key = generateRandomString(10);
    await producer.connect();
    await producer.send({
      topic: topic,
      messages: [{ key:key, value: now }],
    });
    console.log("Message produce key:", key);
    await producer.disconnect();
  }

  // ฟังก์ชันสำหรับรับข้อความ (Consumer)
  async function consumeMessage() {
    await consumer.connect();
    await consumer.subscribe({ topic: topic, fromBeginning: true });

    await consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        console.log("Message comsume key:", message.key.toString());
        //console.log("Message comsume value:", message.value.toString());
        //console.log("Message offset value:", message.offset);
        await consumer.commitOffsets([
            { topic, partition, offset: (Number(message.offset) + 1).toString() },
          ]);
      },
    });
  }

  // เรียกใช้ฟังก์ชัน producer และ consumer
  await produceMessage().catch(console.error);
  // คุณสามารถเปิดการใช้งาน consumer ได้หลังจาก producer ทำงานเสร็จสิ้นแล้ว
  await consumeMessage().catch(console.error);
}

main();

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// ฟังก์ชันสำหรับอ่านการตั้งค่าจากไฟล์ client.properties
function readConfig(fileName) {
    const data = fs.readFileSync(fileName, "utf8").toString().split("\n");
    return data.reduce((config, line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        config[key.trim()] = value.trim();
      }
      return config;
    }, {});
}
