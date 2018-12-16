import { AppPage } from './app.po';

describe('robinhood-merchant App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  xit('createshould display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
