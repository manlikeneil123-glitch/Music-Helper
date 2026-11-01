// Topic bank: everyday-hook questions in the style of Oxbridge interviews (PPE, E&M, Economics)
// and essay competitions. One question per line. Duplicates are removed at load (see app.js).
const lines = (s) => s.split('\n').map((t) => t.trim()).filter(Boolean);

window.TOPICS = {
  economics: lines(`
Why does a bottle of water cost more at the airport?
Why do footballers earn more than nurses?
Should the price of a concert ticket rise when demand is high?
Why is a diamond worth more than water?
Is it ever right to set a maximum price on bread?
Why are houses so expensive in London?
Should rent be capped?
Why do cinemas charge the same for every film?
Why is popcorn so expensive at the cinema?
Why do supermarkets put milk at the back of the shop?
Why does a cup of coffee cost more in a café than at home?
Should the minimum wage be the same everywhere in the country?
Would a higher minimum wage cost young people jobs?
Why do some jobs pay so little when they matter so much?
Is a university degree still worth the money?
Should university be free?
Why do prices only seem to go up?
Is inflation always a bad thing?
Who wins and who loses from inflation?
Why don't governments just print more money?
Why do interest rates affect the price of houses?
Should the Bank of England be independent of politicians?
What would happen if everyone saved more money at once?
Is economic growth good for happiness?
Should we measure success by GDP?
Can a country grow forever on a finite planet?
Why are some countries rich and others poor?
Does foreign aid actually help?
Should rich countries forgive the debts of poor countries?
Is free trade fair?
Should we buy local produce to help the economy?
Who really pays for a tariff?
Why do we import goods we could make ourselves?
Should a country protect its steel industry?
Is globalisation over?
Why are your trainers made on the other side of the world?
Is fast fashion an economic success or failure?
Should plastic bags cost money?
Does a sugar tax make people healthier?
Should cigarettes be banned or taxed?
Should alcohol have a minimum price?
Should junk food adverts be banned?
Is a carbon tax the best way to fight climate change?
Should flying be taxed more heavily?
Should public transport be free?
Should drivers pay to enter city centres?
Why is there traffic, and can economics fix it?
Why do trains cost more at rush hour?
Is surge pricing on Uber fair?
Why do airlines charge different people different prices?
Should prices be allowed to change by the minute?
Why do shops sell things for £9.99 instead of £10?
Why are printers cheap but ink is expensive?
Why do supermarkets have loyalty cards?
Do "buy one get one free" deals really save you money?
Why do people queue for new iPhones?
Why do luxury brands burn unsold stock?
Why would anyone pay more because something is expensive?
Is advertising good for the economy?
Should tipping be abolished?
Should all workers get paid sick leave?
Would a four-day week make the economy stronger?
Should everyone get a universal basic income?
Will robots take our jobs?
Is working from home good for the economy?
Why do city-centre sandwich shops close when offices empty?
Should the state pension age keep rising?
Who should pay for care for the elderly?
Does an ageing population spell economic trouble?
Is immigration good for the economy?
Do immigrants lower wages?
Should rich people pay higher taxes?
Should there be a wealth tax?
Should inheritance be taxed?
Is a flat tax fairer?
Why do people avoid paying tax?
Should companies pay tax where they sell or where they are based?
Is inequality a problem in itself?
Does it matter if billionaires exist?
Should CEOs earn 300 times more than their staff?
Why does the gender pay gap exist?
Should pay be public?
Is the housing market rigged against young people?
Should second homes be taxed more?
Should we build on the green belt?
Why don't we just build more houses?
Who should own water companies?
Should the railways be nationalised?
Should energy companies be owned by the state?
Should the government cap energy bills?
Why did energy bills rise so fast?
Does the NHS need a price system?
Should we pay people to donate organs?
Should blood donors be paid?
Should students be paid to go to school?
Should we pay people to recycle?
Why do people litter when it hurts everyone?
Why do we overfish the oceans?
Who owns the air?
Should water be free?
Should the government bail out failing companies?
Should banks be allowed to fail?
Why was 2008 a crisis for ordinary people?
Can a recession ever be good?
Why do we have booms and busts?
Is austerity ever the right choice?
Does government debt matter?
Should governments spend their way out of a recession?
Are taxes the price we pay for civilisation?
Should the government ban payday loans?
Is cash dying, and does it matter?
Should the UK rejoin the EU single market?
What has Brexit done to the price of food?
Why did prices rise after the pandemic?
Why did the pandemic make some people richer?
Why are some markets dominated by one firm?
Should Amazon be broken up?
Should Google be treated like a utility?
Is a monopoly always bad?
Why do supermarkets all charge similar prices?
Should price gouging be illegal during a crisis?
Should hand sanitiser have been price-capped in 2020?
Why do black markets exist?
Should drugs be legalised and taxed?
Should gambling adverts be banned?
Why do people buy lottery tickets?
Are humans rational?
Why do we keep paying for gym memberships we never use?
Why is it so hard to save money?
Should the government nudge people into good choices?
Should pension saving be compulsory?
Why do we value things more once we own them?
Why do people stay in a bad film because they paid for it?
Is it rational to vote?
Why do people give money to charity?
Is charity better than tax?
Should we pay people more for dangerous jobs?
Should the government guarantee everyone a job?
Why is youth unemployment so high?
Should there be a maximum wage?
Does a strong pound help or hurt Britain?
Why does a holiday abroad cost more when the pound falls?
What is the real cost of a free school meal?
Should school uniforms be cheaper by law?
Why are textbooks so expensive?
Why is childcare so expensive in the UK?
Should childcare be free?
Is unpaid housework part of the economy?
Should carers be paid by the state?
Should we have a sugar tax on sweets too?
Why are healthy foods often more expensive?
Should fuel duty be cut?
Should electric cars be subsidised?
Who should pay for climate change?
Can economics put a price on nature?
Should we pay farmers to rewild their land?
Is economic growth compatible with net zero?
Why do some towns decline when a factory closes?
Should the government move jobs out of London?
What makes a high street survive?
Why are so many high street shops closing?
Should online shopping be taxed more?
Why do some products cost more in the UK than in the US?
Should the price of insulin be capped?
Why do medicines cost so much to develop?
Should patents on vaccines be waived?
Is it fair that drug companies profit from illness?
Should sport stadiums be built with public money?
Should the Premier League share more money with lower leagues?
Should there be a salary cap in football?
Why do football clubs keep going bust?
Why do tickets for the World Cup cost so much?
What does the Olympics do to a city's economy?
Why did the price of eggs make headlines?
Why is chocolate getting smaller but not cheaper?
Is shrinkflation dishonest?
Why do petrol prices rise fast but fall slowly?
Why do landlords and tenants disagree about rent controls?
Should students in halls pay less in summer?
Should the voting age matter to economic policy?
Is the economy a zero-sum game?
Can everyone get richer at the same time?
Does a rising tide lift all boats?
Is money the best measure of value?
What is the most important invention for the economy?
Was the Industrial Revolution good for workers?
What can economics learn from history?
Is capitalism the best system we have?
Could a planned economy work with modern computers?
Is socialism fairer than capitalism?
Do markets reward the right things?
Should there be a market for everything?
Is it wrong to sell your place in a queue?
Should people be allowed to sell their vote?
Should parking be free?
Why is parking so expensive in city centres?
Who benefits when a new train line is built?
Was HS2 worth it?
Should toll roads be more common?
Why do some countries drive economic miracles?
What can Britain learn from Singapore?
Why has China grown so fast?
Why did Japan's economy stall for decades?
Why is Argentina always in crisis?
Can a country be too dependent on oil?
Why do countries with lots of natural resources stay poor?
Should Britain trade more with Africa?
What does a strong dollar mean for the rest of the world?
Should everyone use the same currency?
Should the euro exist?
Is the US dollar's dominance fair?
Should central banks create digital money?
Is a recession coming, and how would we know?
What do economists get wrong most often?
Should economists be trusted more than politicians?
Why do economists disagree?
Is economics a science?
Can we predict the economy?
What is the one statistic you would use to judge a country?
Is happiness a better target than income?
Does money buy happiness?
Should the government care about wellbeing over wealth?
Is it fair that where you are born decides your income?
Should there be open borders?
Should the government fund the arts?
Should libraries be free?
Should museums charge entry?
Is the BBC licence fee fair?
Should social media companies pay for news?
What is the economic value of a good teacher?
Why are teachers paid less than bankers?
Is it fair that some jobs are paid by the hour and others by the year?
Should interns always be paid?
Is unpaid work experience unfair to poorer students?
`),

  stocks: lines(`
Why do share prices go up and down every day?
Is the stock market just gambling?
Should teenagers invest in the stock market?
Why would anyone buy a share in a company that loses money?
Is it possible to beat the market?
Should most people just buy an index fund?
Why do share prices fall when interest rates rise?
Is the stock market the same as the economy?
Why can the stock market rise during a recession?
What is a company really worth?
Why is Nvidia worth more than most countries' GDP?
Is Tesla overvalued?
Why do tech companies have such high valuations?
Are AI stocks a bubble?
How would you spot a stock market bubble?
What can the dot-com crash teach today's investors?
Was the GameStop squeeze a win for small investors?
Should meme stocks be regulated?
Should short selling be banned?
Is it wrong to profit from a company failing?
Should company bosses be paid in shares?
Why do companies buy back their own shares?
Should share buybacks be restricted?
Why do some companies pay dividends and others don't?
Should a company care about its shareholders or its workers first?
Should companies serve society or shareholders?
Does ethical investing actually change anything?
Should pension funds sell oil company shares?
Is ESG investing a fad?
Is greenwashing a problem in investing?
Should you invest in companies you disagree with?
Should insider trading be legal?
Should politicians be allowed to trade shares?
Why do companies go public?
Why do some companies stay private for so long?
Why do so many IPOs disappoint investors?
What makes a company a good long-term investment?
Would you rather own Apple or a house?
Are shares or property the better investment?
Is gold a good investment?
Should you invest in what you know?
Why do most fund managers fail to beat the index?
Are hedge funds worth their fees?
Should trading apps be allowed to feel like games?
Does commission-free trading make investing better or worse?
Do finfluencers do more harm than good?
Should investment advice on TikTok be regulated?
Why do people panic sell?
Why do investors follow the crowd?
Is it better to invest a lump sum or a little each month?
Can you time the market?
Is time in the market better than timing the market?
What would you do if the market fell 30% tomorrow?
Why do markets crash?
Why did markets crash in March 2020 and recover so fast?
Should stock markets close during a crisis?
Should high-frequency trading be banned?
Are computers better investors than humans?
Will AI replace stock pickers?
Should algorithms be allowed to trade without humans?
What caused the 1929 crash?
What did Black Monday teach regulators?
Was the 2008 crash caused by greed or bad rules?
Who should take the blame when a company collapses?
Why did Enron fool so many people?
Why do frauds like Wirecard go undetected for years?
Should auditors be liable for missing fraud?
Should we trust company accounts?
Why do analysts almost never say sell?
Do quarterly earnings reports encourage short-term thinking?
Should companies stop giving quarterly results?
Why does a company's share price fall even when profits rise?
Is the London Stock Exchange in decline?
Why do British companies list in New York?
Should the UK make its stock market more attractive?
Should British savers be pushed to invest in British shares?
Why are a few US tech giants so dominant in the stock market?
Is it risky that seven companies make up so much of the S&P 500?
Should index funds have voting power?
Do index funds make markets less efficient?
Are big asset managers too powerful?
Should BlackRock decide how companies are run?
Should workers own shares in their company?
Is employee ownership the future?
Should the government own shares in companies?
Should Britain have a sovereign wealth fund?
What would you invest £1,000 in today and why?
Which company would you never sell?
Which company today will not exist in 20 years?
Which company will be the most valuable in 2040?
Is Warren Buffett's approach still relevant?
What is Buffett's best lesson for students?
Is value investing dead?
Is growth investing just speculation?
Why do investors love companies with no profits yet?
Should you buy shares in a company because you like its products?
Is buying a share like buying a lottery ticket?
How much should luck count in investing?
Why do people trust tips from friends?
What is a fair price for a share in a football club?
Should football clubs be listed on the stock market?
Why do sports teams sell for so much?
Why did Twitter's buyout become such a mess?
Why do mergers often destroy value?
Should big mergers need government approval?
Should foreign companies be allowed to buy British firms?
Should the government block takeovers of key companies?
Are private equity firms good for the companies they buy?
Should a company be allowed to borrow to buy itself?
Why do companies split their shares?
Does a company's logo or brand affect its share price?
How do celebrity CEOs affect share prices?
Should CEOs be allowed to post freely on social media?
Can one tweet move a market?
Why do markets react to rumours?
Are markets efficient?
Is it possible for everyone to beat the average?
Why is investing easier than ever but most people still don't?
Should the government give every child shares at birth?
Should stock market investing be taught in schools?
Why do women invest less than men?
Why do young people prefer crypto to shares?
Are stocks better than crypto?
Should crypto be traded on stock exchanges?
Is the stock market fair to small investors?
Should stock trading be taxed?
Should a transaction tax be put on every share trade?
Should capital gains be taxed like income?
Should dividends be taxed more?
Why do pensions invest in stocks?
Is it wise to have your pension in the stock market?
Should young people take more investment risk than old people?
What does a share actually give you?
Do shareholders really own a company?
Should shareholders vote on CEO pay?
Should companies with two classes of shares be allowed?
Why do founders want to keep control after going public?
Should a company ever ignore its share price?
Why do share prices rise when companies announce job cuts?
Is it wrong that markets cheer layoffs?
Should there be limits on how fast a share price can fall?
Why do defence stocks rise during wars?
Is it ethical to invest in weapons makers?
Should tobacco companies be on the stock market?
Should pension funds hold gambling companies?
Does investing in renewable energy pay off?
Why did clean energy shares crash after 2021?
Are electric car makers overvalued?
Why do oil companies still make record profits?
Should there be a windfall tax on profitable companies?
What happens to share prices during an election?
Do markets prefer one political party?
Why do markets hate uncertainty?
Should central banks support stock markets?
Should the Fed care about share prices?
What does it mean when the yield curve inverts?
Why do bonds and shares sometimes fall together?
Why did the 60/40 portfolio fail in 2022?
Should you invest abroad or at home?
Why do investors favour their own country?
Is China's stock market investable?
Why does India's stock market keep rising?
Is Japan's stock market back?
Is Europe's stock market undervalued?
Why are American companies valued more highly than British ones?
What would happen if Apple went bust?
Is too much money chasing too few good companies?
Should stock market prices be shown on the news every night?
What can a share price tell you about a company?
What can a share price never tell you?
Why do share prices often jump on a company's first day of trading?
Is it ever sensible to put all your money in one company?
Why do investors care so much about what a CEO says on an earnings call?
Should you sell a share just because its price has doubled?
Why do some companies never pay a dividend but still reward investors?
Is a falling share price a buying opportunity or a warning?
Why do people hold on to losing shares for too long?
Should you invest in a company because of a news headline?
What would make you sell all your shares tomorrow?
Why do supermarket shares stay steady in a recession?
Why do luxury brand shares do well when the rich get richer?
Why did Netflix shares soar and then crash?
Why did Meta's shares halve and then recover?
Is Amazon a retailer or a technology company to investors?
Why is Coca-Cola a favourite of long-term investors?
Should you invest in a company whose products you use every day?
Why do airline shares struggle even when planes are full?
Why do housebuilder shares rise and fall with interest rates?
Should football fans buy shares in their club?
Why do video game company shares swing so much?
Why did Peloton's share price collapse after the pandemic?
Why did Zoom's shares boom and fade?
Why do some brands survive for a century on the stock market?
Is a company with a famous brand always a good investment?
Should the stock market reward companies for sacking staff?
Why do markets rise on bad economic news sometimes?
Is investing in the stock market a form of saving?
Should you check your investments every day?
Why do investors fear rising wages?
Should children be allowed to own shares?
Is it fair that the rich own most shares?
Would society be better if everyone owned shares?
Why does the FTSE 100 have so few tech companies?
Should British pension funds be forced to invest in the UK?
Should a company list in London or New York?
Why does a weak pound boost the FTSE 100?
Why are bank shares cheap compared with tech shares?
Is investing in a company the same as supporting it?
Why do stock markets usually rise over the long run?
Can the stock market keep rising forever?
`),

  finance: lines(`
Should you save or spend your first pay cheque?
Is it better to rent or buy a home?
Should you pay off debt or save first?
Is student debt good debt?
Should students worry about their student loan?
Is the student loan really a loan or a tax?
Should financial education be compulsory in schools?
Why do so many adults struggle with money?
Should your parents pay for university?
How much money is enough?
Does money make people happier after a certain point?
Is it better to spend money on experiences or things?
Why is it so easy to spend money online?
Are buy now, pay later schemes dangerous?
Should buy now, pay later be regulated like credit cards?
Why do credit cards charge such high interest?
Should credit cards be banned for under-21s?
Should payday lending be illegal?
Why do poor people pay more for things?
Is the poverty premium fair?
Why are some people unbanked?
Should cash be protected by law?
What happens to people who cannot go cashless?
Should banks be allowed to close local branches?
Should banking be a public service?
Should banks pay higher interest on savings?
Why do banks profit when interest rates rise?
Why was Silicon Valley Bank allowed to fail?
How safe is your money in a bank?
Should the government guarantee all bank deposits?
Why do banks lend more money than they have?
Should bankers' bonuses be capped?
Should a banker go to jail for a bank collapse?
Is crypto real money?
Will Bitcoin replace the pound?
Should Bitcoin be banned?
Why did FTX collapse?
Should crypto exchanges be regulated like banks?
Are NFTs worthless?
Is crypto good for poor countries?
Should countries make Bitcoin legal tender?
Is mobile money changing Africa?
Why did M-Pesa succeed in Kenya?
Should fintech replace banks?
Are apps like Monzo and Revolut better than banks?
Is open banking safe?
Should we trust AI with our money?
Should insurance companies use your data to set prices?
Is it fair that young drivers pay more for insurance?
Should car insurance depend on where you live?
Should health insurance replace the NHS?
Should you insure your phone?
Why do we buy insurance we rarely use?
Is the lottery a tax on the poor?
Should gambling be banned online?
Should loot boxes be treated as gambling?
Why is sports betting so popular with young men?
Should betting companies sponsor football shirts?
What should everyone know about compound interest?
Why does starting to save early matter so much?
How much of your income should you save?
Should saving be automatic?
Is a pension the best way to save?
Should you rely on the state pension?
Will the state pension still exist when you retire?
Should people be forced to save for retirement?
Is retiring early a realistic goal?
Is the FIRE movement selfish?
Should you work for passion or money?
Would you take a higher salary or a job you love?
Should you negotiate your first salary?
Is a side hustle a sign of a broken economy?
Should young people invest or pay off student loans?
Should parents give children pocket money?
Should pocket money be linked to chores?
When should children have their own bank account?
Should teenagers have debit cards?
How do you teach a child the value of money?
Is it fair that inheritance decides so much?
Should inherited wealth be taxed at 100%?
Should parents help children buy a house?
Is the bank of mum and dad unfair?
Why is it harder to buy a house today than 30 years ago?
Should mortgages last 40 years?
Should first-time buyers get special help?
Does Help to Buy push up house prices?
Should house prices be allowed to fall?
Are landlords good or bad for society?
Should buy-to-let be discouraged?
Should Airbnb be restricted in cities?
Who should own the homes we live in?
Is renting forever really so bad?
Should rent count towards a credit score?
Are credit scores fair?
Should a bad credit score follow you for years?
Should bankruptcy be easier?
Should student debt be cancelled?
Should medical debt exist?
Why does debt cause so much stress?
Should financial advisors be paid by commission?
Is financial advice only for the rich?
Can you trust a robo-advisor?
Should finance jobs pay so much?
Do bankers deserve their pay?
Does the City of London help or hurt Britain?
Should London remain a financial centre?
Is finance too big for the economy?
Do we need investment banks?
Why do hedge funds exist?
Is private equity good for society?
What does a venture capitalist actually do?
Should pension funds invest in start-ups?
Why do companies borrow money?
Is it better for a company to borrow or sell shares?
What happens when a company runs out of cash?
Why do profitable companies go bust?
Is cash more important than profit?
Can accounting be creative without being dishonest?
Should company accounts be easier to read?
Why are tax havens allowed to exist?
Should tax avoidance be illegal?
Is it wrong for celebrities to avoid tax?
Should multinationals pay a global minimum tax?
Should the tax system be simpler?
Why do we pay tax on savings?
Should ISAs have limits?
Should the government reward saving?
Should there be a tax on luxury goods?
Is a VAT increase fair to the poor?
Should tips be taxed?
Should influencers pay more tax?
How should freelancers plan for tax?
Should young people get tax breaks?
Should money be spent on a wedding or a house deposit?
Is a car a terrible financial decision?
Should you lease or buy a car?
Is it ever smart to buy a luxury item?
Is "buy it for life" a better way to shop?
Is frugality a virtue or a trap?
Why do people show off with money?
What does old money know that new money doesn't?
Why do lottery winners often go broke?
Why do so many famous athletes go bankrupt?
Should footballers be given financial training?
Is being rich a skill or luck?
Do rich people have a duty to give money away?
Is effective altruism the right way to give?
Should billionaires be allowed to fund their own space programmes?
Is philanthropy a way to avoid tax?
Should charities be run like businesses?
Is microfinance a success or failure?
Should loans to the poor have interest?
Is charging interest ever unethical?
Why does Islamic finance avoid interest?
What is money?
Why do we trust paper money?
Could a society work without money?
Why did the gold standard end?
Should money be backed by something real?
Why does inflation hurt savers?
Should savings be protected from inflation?
How should you invest when prices are rising?
What would you do with £10,000 at 18?
What would you do with a million pounds?
How would you explain debt to a ten-year-old?
What is the best piece of money advice you have heard?
What is the worst money habit young people have?
Should relationships have joint bank accounts?
Should couples talk about money before marriage?
Should prenups be standard?
Why do money arguments end relationships?
Is it rude to ask someone's salary?
Should everyone's salary be public?
Does pay transparency help women?
Why do women retire with smaller pensions?
Is there a pink tax?
Should financial scams be the bank's responsibility?
Should banks refund scam victims?
Why do smart people fall for scams?
Are Ponzi schemes always obvious in hindsight?
Should pyramid-style selling be banned on social media?
Is dropshipping a scam?
Are online trading courses legitimate?
Should finance influencers have to declare their losses?
Is it worth paying for a premium bank account?
Should you lend money to friends?
Should you ever borrow money to invest?
Why do some people never check their bank balance?
Is it better to have one bank account or several?
Should students work part-time while studying?
Is a gap year a good financial decision?
Should apprenticeships pay more?
Why do concert tickets have such high booking fees?
Should resale of tickets above face value be banned?
Is splitting the bill equally fair?
Should you budget for fun?
Why do people spend more with cards than with cash?
Is contactless payment making us spend more?
Should there be a limit on how much you can bet in a day?
Why is it so hard to cancel a gym membership?
Should energy bills be paid monthly or by use?
Why do people overpay for convenience?
Is buying second-hand the smartest way to shop?
Why do big purchases feel smaller on finance?
`),

  ai: lines(`
Will AI take your future job?
Which jobs are safest from AI?
Should students be allowed to use AI for homework?
Is using ChatGPT for an essay cheating?
Should schools teach students how to use AI?
Will AI make teachers obsolete?
Should exams change because of AI?
Can AI be creative?
Is AI art real art?
Who owns a picture made by AI?
Should AI companies pay artists whose work trained them?
Should AI be allowed to copy a singer's voice?
Should deepfakes be illegal?
How will deepfakes affect elections?
Can we trust anything we see online anymore?
Should AI-generated content have to be labelled?
Is AI making us lazier thinkers?
Will AI make people lonelier?
Should people have AI friends?
Should AI be used as a therapist?
Can a chatbot really understand you?
Could AI ever be conscious?
Should a conscious AI have rights?
Should AI be allowed to make life-or-death decisions?
Should self-driving cars be allowed on UK roads?
Who is to blame when a self-driving car crashes?
Should a self-driving car protect its passenger or pedestrians?
Should AI be used in hiring?
Is it fair for AI to read your CV?
Can an algorithm be racist?
Why does AI copy human bias?
Should police use facial recognition?
Should AI be used to predict crime?
Should judges use AI to help decide sentences?
Should AI diagnose illness?
Would you trust an AI doctor?
Will AI make healthcare cheaper?
Can AI help cure diseases?
Should AI be used in war?
Should autonomous weapons be banned?
Is there an AI arms race between the US and China?
Should AI development be paused?
Is AI an existential risk to humanity?
Are AI doomers right?
Who should regulate AI?
Should AI be regulated like medicine?
Is the EU right to regulate AI strictly?
Will regulation stop Britain competing in AI?
Should AI models be open source?
Should a few big companies control AI?
Is AI the new electricity?
Is AI a bubble?
Will AI make the rich richer?
Will AI increase inequality between countries?
Should AI profits be taxed to pay everyone?
Should robots pay tax?
Will AI lead to a four-day week?
What will people do if machines do most work?
Will AI create more jobs than it destroys?
Will AI replace programmers?
Is learning to code still worth it?
Should you study something AI cannot do?
Will AI make university degrees less valuable?
How will AI change the job of a lawyer?
How will AI change journalism?
Should news websites be paid when AI uses their articles?
Will AI destroy search engines?
Is Google search dying?
Why does AI sometimes make things up?
Should AI admit when it is unsure?
Should we trust AI more than experts?
Can AI help fight climate change?
How much energy does AI use, and does it matter?
Should data centres be built in Britain?
Who owns your data?
Should you be paid for your data?
Is your phone listening to you?
Do social media algorithms control what we think?
Should algorithms be transparent?
Should TikTok's algorithm be regulated?
Is the For You page good for society?
Should children have smartphones?
Should social media be banned for under-16s?
Do smartphones harm teenagers' mental health?
Are screen time limits effective?
Should tech companies be responsible for addiction?
Is the attention economy bad for us?
Why are free apps not really free?
Should social media companies pay for harm they cause?
Is the internet better or worse than ten years ago?
Is the internet full of bots?
Should you need to prove you are human online?
Should anonymity be allowed online?
Should tech companies be broken up?
Is Big Tech too powerful?
Should Elon Musk own a social network?
Should one person control a major platform?
Do tech billionaires have too much influence on politics?
Is Silicon Valley good for the world?
Can Europe build its own tech giants?
Why does Britain not have a Google?
Should the government invest in AI?
Should AI chips be export-controlled?
Why are computer chips so important?
Why does Taiwan matter so much for technology?
Should every country make its own chips?
Will quantum computing change everything?
Is technology neutral?
Does technology make us more free?
Is technological progress inevitable?
Were the Luddites right?
What can the Industrial Revolution teach us about AI?
Is AI more like the printing press or the atom bomb?
Would you let an AI choose your university course?
Would you let AI plan your day?
Should AI write politicians' speeches?
Should AI be allowed to vote or run for office?
Could AI run a country better than politicians?
Could AI run a company?
Will we have a company with one employee worth a billion?
Should AI be used to mark exams?
Should AI tutors replace private tuition?
Can AI close the gap between rich and poor students?
Will AI make language learning pointless?
Should AI translate everything?
Can AI help older people live alone?
Should robots look after the elderly?
Should robots look like humans?
Why do humanoid robots feel creepy?
Should we be polite to AI?
Does AI have a personality?
Should AI tell you what you want to hear?
Is AI flattering us too much?
Can AI be manipulative?
Should AI be used in advertising?
Should AI be allowed to set prices?
Can algorithms collude to raise prices?
Should AI be used to detect benefit fraud?
Should the government use AI to make decisions about you?
Should you have the right to know if an AI judged you?
Should you have the right to a human decision?
Is a world without work desirable?
What makes humans special if AI can do everything?
Will AI change what it means to be intelligent?
Is the Turing test still useful?
Should AI be taught ethics?
Whose values should AI follow?
Who decides what AI should refuse to do?
Should AI be allowed to disagree with you?
Should AI be used to spot fake news?
Can AI solve misinformation, or make it worse?
Should streaming services use AI to make films?
Should AI actors be allowed in films?
Should AI-generated music be on the charts?
Will AI replace influencers?
Is a virtual influencer dishonest?
Should AI write books?
Should AI read bedtime stories to children?
Should toys contain AI?
Should AI be in cars, fridges and everything else?
Is the smart home a privacy risk?
Should you wear AI glasses?
Should brain chips be allowed?
Should humans merge with machines?
Will AI help us live longer?
Can AI make scientific discoveries on its own?
Why did AlphaFold matter so much?
What problem should AI solve first?
What is the biggest risk of AI no one talks about?
What is the most overhyped thing about AI?
Should you be optimistic about AI?
Will AI make the world fairer?
Is AI good for democracy?
Should AI be a public good?
Should AI companies be non-profit?
Is it right for AI labs to race each other?
Should AI researchers be allowed to publish everything?
Should hackers use AI?
Can AI keep us safe from cyber attacks?
Should AI be used to scam people, and how do we stop it?
Should AI voice clones of the dead be allowed?
Should you be able to talk to a dead relative through AI?
Should AI be allowed to grade university applications?
Would you trust AI to write your personal statement?
Should AI-written personal statements be banned?
Can AI help you think, or does it think for you?
Will AI make homework pointless?
Should AI be used to spot plagiarism?
Is it cheating to use AI to revise?
Should AI be allowed in sport, like VAR?
Should referees be replaced by technology?
Should AI pick football teams?
Will AI change how we shop?
Should AI decide your insurance price?
Should AI decide who gets a loan?
Should banks explain why an AI refused you credit?
Will AI make customer service better or worse?
Should a chatbot have to say it is a bot?
Is it wrong to fall in love with an AI?
Should AI remember everything you tell it?
Will AI make the news more or less trustworthy?
What job would you give AI first, and what job never?
`),

  entrepreneurship: lines(`
Are entrepreneurs born or made?
Should everyone try to start a business?
Is it better to start a business young or old?
Should you drop out of university to start a company?
Is a university degree useful for entrepreneurs?
Should entrepreneurship be taught in schools?
Is failure good for entrepreneurs?
Why do most start-ups fail?
Is luck more important than skill in business?
What makes a good business idea?
Is it better to be first or to be better?
Should you copy a business that already works?
Is competition good for a new business?
Is a lemonade stand a good lesson in economics?
What could you sell at school, and should you?
Should teenagers have side hustles?
Is reselling trainers a real business?
Is dropshipping entrepreneurship?
Should influencers count as entrepreneurs?
Is being a content creator a real job?
Should you turn your hobby into a business?
Is it better to work for yourself or for a company?
Is hustle culture healthy?
Should founders work 100-hour weeks?
Is burnout the price of success?
Should founders pay themselves a salary?
Should you start a business with your best friend?
Should you start a business with family?
Why do co-founders fall out?
How should a company be shared between founders?
Is it better to take investment or grow slowly?
Should start-ups chase growth or profit?
Is it ever right to lose money to win customers?
Was Uber's strategy fair to taxi drivers?
Should delivery riders be employees?
Is the gig economy good for workers?
Should Deliveroo riders have sick pay?
Are platforms like Airbnb good for cities?
Why did WeWork fail?
What can Theranos teach about honesty in business?
Should founders be allowed to "fake it till they make it"?
Is overpromising necessary to raise money?
Why do investors fund companies that lose billions?
What do investors look for in a founder?
Should investors care about founders' age, gender or background?
Why do so few women get start-up funding?
Should the government fund start-ups?
Should business loans be cheaper for young people?
Is crowdfunding a good way to raise money?
Should customers be investors?
Why are some places full of start-ups?
Why is Silicon Valley in California?
Could Britain build its own Silicon Valley?
Should start-ups pay less tax?
Should small businesses have fewer rules?
Is red tape killing small businesses?
Why do so many restaurants fail?
Would you open a café on your high street?
How would you save a dying high street shop?
How would you sell ice to people who live somewhere cold?
How would you price a new product?
Should a business charge more or sell more?
Is free a good price?
Why do so many apps use subscriptions?
Should subscriptions be easier to cancel?
Is it ethical to make products addictive?
Should businesses use dark patterns?
Should companies be allowed to collect your data for free services?
Is advertising manipulation?
How did Nike build such a powerful brand?
Why does Apple charge more than its rivals?
Why do people pay more for a logo?
Why did Blockbuster lose to Netflix?
Why did Kodak fail to adapt?
Why do big companies struggle to innovate?
Can a giant company think like a start-up?
Is it better to disrupt or to improve?
Is disruption always good for society?
Should a business ever turn down customers?
Should businesses take political sides?
Should companies speak out on social issues?
Should a business put profit before purpose?
Can a business be both ethical and profitable?
Is Patagonia a model for other companies?
Should all businesses be B Corps?
Is social enterprise the future?
Should a charity act like a business?
Can business solve poverty?
Is entrepreneurship the best way out of poverty?
Should entrepreneurs be celebrated like celebrities?
Do we glorify billionaire founders too much?
Should we trust Elon Musk's vision?
What can you learn from Steve Jobs?
Is it important for a founder to be likeable?
Should a founder stay CEO forever?
When should a founder step aside?
Should a business ever be sold?
Should you build a company to sell it or to keep it?
Is a family business better run than a public company?
Should businesses be passed down to children?
Why do family businesses often fail in the third generation?
What makes a good boss?
Should bosses be friends with employees?
Is remote work good for start-ups?
Should start-ups offer unlimited holidays?
Is company culture just marketing?
How would you hire your first employee?
Should you hire for skill or attitude?
Is it fair to pay start-up staff in shares?
Should employees share in profits?
Should workers have seats on company boards?
Are trade unions good for business?
Should a business pay more than the minimum wage?
Is it smart to pay staff above market rate?
Why did Henry Ford double his workers' pay?
Should businesses be allowed to ban phones at work?
What makes customers loyal?
Is the customer always right?
Should businesses respond to every online review?
Are fake reviews a serious problem?
Can a viral video make a business?
Should every business be on TikTok?
How do small businesses compete with Amazon?
Is Amazon good or bad for small sellers?
Why do people still shop in physical stores?
Is the future of shopping online or in person?
What would you build to solve a problem at your school?
What problem in your town would you start a business to solve?
What is a problem you would pay someone to solve?
What everyday annoyance could be a business?
How would you make money from rubbish?
Can recycling be a profitable business?
Is climate change a business opportunity?
Should start-ups focus on solving big problems?
Is a boring business better than an exciting one?
Should you build something nobody has asked for?
Should you listen to customers or ignore them?
Did Henry Ford's customers really want a faster horse?
Should a business launch before it's perfect?
Is it better to do one thing well or many things?
Should a business say no to opportunities?
How do you know when to give up on an idea?
When should a business pivot?
What is the most important skill for an entrepreneur?
Is confidence more important than competence?
Can introverts be great entrepreneurs?
Is risk-taking a personality trait?
Why do some people fear starting a business?
Is a safe job riskier than starting a business?
Should parents encourage children to be entrepreneurs?
Is the entrepreneurial dream realistic for everyone?
Does entrepreneurship need a safety net like the NHS?
Is a welfare state good for entrepreneurs?
Should failed founders get a second chance at funding?
Should bankruptcy carry a stigma?
Should start-ups be allowed to break rules to grow?
Was Airbnb right to ignore hotel laws?
Should regulators protect old industries from new ones?
Should taxi licences exist?
Should we ban companies from becoming too big?
Should successful start-ups be allowed to buy their rivals?
Is a monopoly the goal of every start-up?
Why do businesses love network effects?
Why is it hard to start a new social network?
Can a business be too successful?
Why do businesses need to keep growing?
Can a business stay small on purpose?
Is a lifestyle business a failure?
What does success mean for a business?
Should a business measure success by happiness?
What would your ideal company look like?
What business would you start with £100?
What business would you start with £1 million?
Which business will be huge in ten years?
Which business that exists today should not exist?
Which brand would you rescue if you could?
Which product would you reinvent?
What is the best business you use every day?
What would you change about a business you know well?
Is selling a skill everyone should learn?
How would you pitch your idea in 30 seconds?
Is a good story more important than a good product?
Why do people buy from people they like?
How important is trust to business?
Should businesses be judged by their founders' behaviour?
Should you boycott a business you disagree with?
Do boycotts work?
`),
};

// Deep research: essay-competition style questions worth looking up before you speak.
window.TOPICS.deep = lines(`
Is economic growth still the right goal for rich countries?
Should central banks target inflation, or something else?
Was quantitative easing a success?
Should the UK have a wealth tax?
Would a universal basic income work in the UK?
Is a four-day working week economically sustainable?
Does raising the minimum wage cost jobs? Use the evidence.
What should the UK learn from the 2008 financial crisis?
Was austerity after 2010 the right policy?
What caused the 2021–23 inflation surge?
Should governments cap energy prices?
Should the UK rejoin the EU customs union?
Has Brexit been an economic success or failure?
Is the UK's productivity puzzle solvable?
Why has UK productivity lagged since 2008?
Is "levelling up" possible?
Should the UK build more nuclear power?
Is a carbon border tax fair to poorer countries?
Can carbon pricing alone deliver net zero?
Should rich countries pay climate reparations?
Is degrowth a credible economic idea?
Is GDP a good measure of a nation's success?
Should wellbeing replace GDP as the main target?
Has globalisation done more good than harm?
Is the world deglobalising?
Is China's economic model sustainable?
Could India become the next China?
Why did Japan's economy stagnate for three decades?
Why do some countries escape the middle-income trap?
Why did the Asian Tigers grow so fast?
Is foreign aid effective? Weigh the evidence.
Does microfinance reduce poverty?
Why is Africa's economic potential underestimated?
Is the resource curse real?
Should the US dollar remain the world's reserve currency?
Will central bank digital currencies replace cash?
Is Bitcoin a currency, an asset or neither?
Should stablecoins be regulated as banks?
What did the collapse of FTX reveal about finance?
Was the Silicon Valley Bank collapse a failure of regulation?
Are banks still too big to fail?
Should the UK separate retail and investment banking?
Should private equity be more tightly regulated?
Is the rise of passive investing a threat to markets?
Are financial markets efficient?
Is the stock market rational?
What can tulip mania teach us about bubbles?
Is there an AI stock market bubble?
Compare the dot-com bubble with today's AI boom.
Should short selling be restricted?
Did the GameStop squeeze change finance?
Do share buybacks harm long-term investment?
Should companies maximise shareholder value?
Is ESG investing effective at changing corporate behaviour?
Should pension funds divest from fossil fuels?
Is the UK pension system fit for an ageing population?
Should the state pension triple lock be scrapped?
Who should pay for social care?
Should the NHS charge for some services?
Is the UK housing crisis caused by supply or demand?
Should rent controls be introduced in UK cities?
Should the green belt be built on?
Should housing be treated as a human right or an asset?
Is inheritance making Britain less fair?
Is inequality bad for economic growth?
Does Piketty's r > g explain rising inequality?
Would a maximum wage reduce inequality without hurting growth?
Is the gender pay gap mainly about choices or discrimination?
Does immigration raise or lower wages for native workers?
Should the UK have open borders for skilled workers?
Is the gig economy exploitation or opportunity?
Will AI cause mass unemployment?
Will AI increase or reduce inequality?
Should AI be taxed?
Who should be liable when AI causes harm?
Do open-source AI models make the world safer or more dangerous?
Is the EU AI Act a model for the world?
Should the UK regulate AI like the EU?
Can competition law keep up with Big Tech?
Should Big Tech companies be broken up?
Are digital platforms natural monopolies?
Should personal data be treated as property?
What does the evidence say about social media and teenage mental health?
Does social media harm democracy?
Is the attention economy a market failure?
Should algorithms be audited by the state?
Should autonomous weapons be banned by treaty?
Is the AI race between the US and China dangerous?
Should semiconductor supply chains be brought home?
Is industrial policy back, and should it be?
Was the US CHIPS Act good economics?
Was the Inflation Reduction Act protectionism?
Do tariffs ever work?
What did the US–China trade war achieve?
Should the UK protect strategic industries from foreign takeover?
Should sports clubs be owned by their fans?
Should football have a salary cap?
Is the Premier League a market failure?
Does hosting the Olympics pay off?
What is the economic case for public arts funding?
Should university tuition be free?
Is a university degree still a good investment?
Should student loans be forgiven?
Does private schooling hurt social mobility?
Should private schools pay VAT?
Is meritocracy a myth?
Are markets moral?
Are there things money should not buy?
Should organ sales be legal?
What can Portugal's drug decriminalisation teach other countries?
Should gambling advertising be banned?
Does a sugar tax work?
Should junk food be taxed like tobacco?
Does behavioural economics justify nudging?
Are humans rational economic actors?
Is the tragedy of the commons inevitable?
What did Elinor Ostrom show about shared resources?
Was Keynes right?
Was Hayek right about central planning?
What would Adam Smith think of today's economy?
Would Marx recognise today's capitalism?
Is capitalism compatible with fighting climate change?
Is socialism ever economically viable?
Could a planned economy work with modern computing?
Can economics ever be a true science?
Why do economists so often fail to predict recessions?
Is the Phillips curve dead?
Does government debt matter if you borrow in your own currency?
Is modern monetary theory credible?
Should governments run budget surpluses?
Is it fair to leave debt to future generations?
Should central banks be independent?
Should the Bank of England have a climate mandate?
What caused the Great Depression?
What caused the 1970s stagflation?
Was Thatcherism good for Britain?
Did the Marshall Plan work?
Why did the Soviet economy collapse?
What can Weimar hyperinflation teach us today?
What explains Argentina's repeated crises?
Was Iceland right to let its banks fail?
Was the euro a mistake?
Why did the Greek debt crisis happen?
Should Scotland have its own currency?
Why did Wirecard's fraud go unnoticed?
What did Enron change about corporate governance?
Do auditors serve the public interest?
Should CEOs earn hundreds of times more than workers?
Should workers sit on company boards?
Is employee ownership better than shareholder ownership?
Should the UK create a sovereign wealth fund?
What made Norway's oil fund a success?
Should Amazon pay more tax in the UK?
Should there be a global minimum corporate tax?
Are tax havens a problem worth solving?
Is the high street worth saving?
Is the death of cash a problem?
Should payment apps be regulated like banks?
Are buy now, pay later schemes a debt trap?
Should payday loans be banned?
Is financial education the answer to poor money decisions?
Why do lottery tickets sell despite bad odds?
Is the lottery a regressive tax?
Should start-ups receive public money?
Why does the UK produce few tech giants?
Why do UK companies list abroad?
Is the London Stock Exchange in terminal decline?
Was HS2 worth the money?
What happened when Luxembourg made public transport free?
Should road pricing replace fuel duty?
Is the shift to electric cars fair to poorer drivers?
Should flying be rationed?
Should water companies be renationalised?
Should the railways be publicly owned?
Is privatisation a failure?
Why do natural monopolies need regulating?
Should price gouging be illegal in emergencies?
Should landlords be licensed?
Is Airbnb good or bad for cities?
Should Uber drivers be employees?
Was WeWork a fraud or a failed bet?
What does the fall of Theranos teach about start-up culture?
Should founders keep control after going public?
Is Silicon Valley's "move fast and break things" still acceptable?
Why did Kodak and Nokia fail to adapt?
Can large companies innovate like start-ups?
Is the innovator's dilemma unavoidable?
Is entrepreneurship the best path out of poverty?
Why are women under-represented among founders?
Should the state guarantee a job to everyone?
What is the economic value of unpaid care work?
How should a country support its unpaid carers?
Is the UK's childcare system holding back the economy?
Does an ageing population spell economic decline?
Should the retirement age rise to 70?
Is a falling birth rate an economic emergency?
Should governments pay people to have children?
What would happen to the economy if everyone lived to 120?
Should we put a price on nature?
Can economics value a human life?
Is it ethical to discount the future?
What is the best economic policy no one talks about?
`);
