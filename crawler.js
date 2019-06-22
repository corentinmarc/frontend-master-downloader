const puppeteer = require("puppeteer");
const chalk = require("chalk");
const { msToMin } = require("./utils");
const url = "https://frontendmasters.com";
const SECONDES = 1000;
let stopInterval;

module.exports = async ({ user, pass, courses, id }) => {
  console.log(chalk.green("You are using frontendmaster-downloader \n"));
  console.log(chalk.green("Try the login ... \n"));
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']})
  const page = await browser.newPage();
  await page.setUserAgent(
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36"
  );
  await page.goto(url + "/login");

  await page.waitFor(2 * SECONDES);

  await page.waitForSelector("#username");
  const username = await page.$("#username");
  await username.type(user);
  const password = await page.$("#password");
  await password.type(pass);
  const button = await page.$("button");
  await button.click();
  console.log(chalk.green(user + " logged \n"));
  console.log(chalk.green("First scrape all the links... \n"));
  let selector = ".DashboardHeader";
  await page.waitForSelector(selector);
  const coursePage = url + "/courses/"+courses;
  await page.goto(coursePage);

  console.log(chalk.green("Scraping all the links from" + coursePage + " \n"));
  selector = ".LessonListItem a";
  await page.waitForSelector(selector);
  const links = await page.evaluate(selector => {
    const anchors = Array.from(document.querySelectorAll(selector));
    return anchors.map(anchor => {
      return `${anchor.href}`;
    });
  }, selector);
  let finalLinks = [];
  const newLinks = links.map((link, index) => {
    return {
      index,
      link
    };
  });

  if (id) {
    const searchLink = `${url}/courses/${courses}/${id}/`;

    const useLink = newLinks.filter(item => item.link === searchLink)[0];
    const index = useLink.index;
    const link = useLink.link;
    await page.goto(link);
    selector = "video";

    await page.waitFor(8 * SECONDES);
    const videoLink = await page.evaluate(selector => {
      const video = Array.from(document.querySelectorAll(selector)).pop();
      return video.src;
    }, selector);

    const fileName =
      `${index + 1}-` +
      link
        .split("/")
        .filter(str => str.length)
        .pop() +
      ".mp4";
    try {
      return [{ fileName, videoLink }];
    } catch (err) {
      console.log("ERROR", err);
    }
  } else {
    finalLinks = await getLinks(newLinks); 
    return finalLinks;
  }

  async function getLinks(newLinks) {
    for (const templink of newLinks) {
      console.log(chalk.yellow("scraping", templink.link + "\n"));
      const { index, link } = templink;
      try {
        await page.goto(link);
      } catch (err) {
        //console.log("erreur, err");
      }
      const selector = "video";

      await page.waitFor(8 * SECONDES);
      let videoLink = await page
        .evaluate(selector => {
          const video = Array.from(document.querySelectorAll(selector)).pop();
          return video.src;
        }, selector)
        .catch(err => {
          //console.log(err);
          return "retry";
        });
      //console.log("video link fetched", videoLink);

      if (videoLink === "retry" || !videoLink.length) {
        console.log(chalk.red("You have reached maximum request limit \n"));
        console.log(chalk.blue("Sleeping for 15 minutes \n"));
        await timeout(60 * SECONDES * 15);
        clearInterval(stopInterval);
        console.log(chalk.green("End waiting scraping continues !!!! \n"));
        const { index, link } = templink;
        await page.goto(link);
        const selector = "video";

        await page.waitFor(8 * SECONDES);
        videoLink = await page.evaluate(selector => {
          const video = Array.from(document.querySelectorAll(selector)).pop();
          return video.src;
        }, selector);
      }

      const fileName =
        `${index + 1}-` +
        link
          .split("/")
          .filter(str => str.length)
          .pop() +
        ".mp4";
        
        finalLinks.push({ fileName, videoLink });
        console.log('Update finalLinks', finalLinks);
    }
    return finalLinks;
  }
};
let remainTime;
function timeout(ms) {
  remainTime = ms;
  interval(ms, 1000);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function interval(totalTime, intervalTime) {
  stopInterval = setInterval(loggeRemainingTime, intervalTime);
  function loggeRemainingTime() {
    remainTime = remainTime - intervalTime;
    let time = msToMin(remainTime);
    console.log(chalk.blue(time + "min remaining \n"));
  }
}
