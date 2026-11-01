// Topic bank. One topic per line. Duplicates are removed at load (see app.js).
const lines = (s) => s.split('\n').map((t) => t.trim()).filter(Boolean);

window.TOPICS = {
  economics: lines(`
Supply and demand
Opportunity cost
Inflation
Deflation
Stagflation
Hyperinflation
Shrinkflation
Greedflation
Interest rates
Central banks
The Federal Reserve
Quantitative easing
Quantitative tightening
Money printing
Fiat money
The gold standard
Recession
Depression
Soft landing
Hard landing
Business cycle
GDP
GDP per capita
Purchasing power parity
Unemployment
Natural rate of unemployment
Full employment
Labor force participation
Minimum wage
Living wage
Universal basic income
Wage stagnation
Productivity
Comparative advantage
Absolute advantage
Free trade
Tariffs
Trade wars
Trade deficit
Protectionism
Globalization
Deglobalization
Reshoring
Friend-shoring
Supply chains
Just-in-time inventory
Scarcity
Incentives
Marginal thinking
Diminishing returns
Economies of scale
Diseconomies of scale
Monopoly
Oligopoly
Monopsony
Perfect competition
Antitrust
Price gouging
Price controls
Rent control
Black markets
Externalities
Carbon tax
Cap and trade
Tragedy of the commons
Public goods
Free riders
Moral hazard
Adverse selection
Asymmetric information
The market for lemons
Game theory
Prisoner's dilemma
Nash equilibrium
Zero-sum thinking
Positive-sum games
The invisible hand
Laissez-faire
Keynesian economics
Austrian economics
Monetarism
Supply-side economics
Trickle-down economics
Modern monetary theory
Behavioral economics
Nudges
Loss aversion
Anchoring
Mental accounting
Hyperbolic discounting
Rational actors
Homo economicus
Creative destruction
Schumpeter
Adam Smith
John Maynard Keynes
Milton Friedman
Karl Marx
Friedrich Hayek
Capitalism
Socialism
Communism
Mixed economy
State capitalism
Crony capitalism
Command economy
Gig economy
Attention economy
Creator economy
Sharing economy
Circular economy
Shadow economy
Informal economy
Experience economy
Subscription economy
Care economy
Silver economy
Space economy
Blue economy
Green economy
Degrowth
Sustainable growth
Income inequality
Wealth inequality
The Gini coefficient
Social mobility
The middle class
Progressive taxes
Flat tax
Wealth tax
Estate tax
Sales tax
Value-added tax
Tax havens
Tax evasion vs avoidance
The Laffer curve
National debt
Budget deficit
Austerity
Fiscal stimulus
Stimulus checks
Bailouts
Too big to fail
Government shutdowns
Debt ceiling
Sovereign default
Bond vigilantes
Currency wars
Exchange rates
Strong dollar
Weak currency
Reserve currency
Dedollarization
Currency pegs
Capital controls
Remittances
Foreign aid
Foreign direct investment
Emerging markets
Developing economies
The middle-income trap
Resource curse
Dutch disease
Petrodollars
OPEC
Oil shocks
Energy prices
Food prices
Housing affordability
Housing bubbles
NIMBYism
Zoning laws
Urbanization
Brain drain
Immigration and wages
Aging populations
Birth rate decline
Demographic dividend
Pension crisis
Social Security
Healthcare costs
Student debt
College wage premium
Human capital
Signaling theory
Automation and jobs
Robots and wages
Skills gap
Remote work economics
Four-day work week
Labor unions
Strikes
Right-to-work laws
Collective bargaining
Child labor
Sweatshops
Fair trade
Consumer confidence
Consumer spending
Savings rate
Paradox of thrift
Wealth effect
Animal spirits
Liquidity trap
Velocity of money
Money supply
Fractional reserve banking
Bank runs
Deposit insurance
Lender of last resort
Negative interest rates
Zero lower bound
Yield curve inversion
Leading indicators
Lagging indicators
The Consumer Price Index
Core inflation
Inflation expectations
Wage-price spiral
Cost-push inflation
Demand-pull inflation
Phillips curve
Okun's law
Say's law
Gresham's law
Goodhart's law
Jevons paradox
Baumol's cost disease
Veblen goods
Giffen goods
Luxury goods
Inferior goods
Substitutes
Complements
Price elasticity
Consumer surplus
Producer surplus
Deadweight loss
Rent seeking
Regulatory capture
Lobbying
Corporate welfare
Subsidies
Farm subsidies
Industrial policy
The CHIPS Act
Tariff revenue
Sanctions
Embargoes
Economic warfare
Commodity supercycle
Rare earth metals
Lithium rush
Water scarcity
Climate economics
Stranded assets
Green subsidies
Electric vehicle economics
Nuclear power costs
Infrastructure spending
Public transit economics
Toll roads
Congestion pricing
Surge pricing
Dynamic pricing
Price discrimination
Bundling
Loss leaders
Planned obsolescence
Right to repair
Network effects in economies
Winner-take-all markets
Superstar firms
Market concentration
Big Tech antitrust
Digital taxes
Data as a commodity
The cashless society
Central bank digital currencies
Barter
Gift economies
Tipping culture
The tipping point of tipping
Gross national happiness
Well-being economics
Time poverty
Unpaid labor
Lump of labor fallacy
Broken window fallacy
Sunk cost fallacy
Hindsight bias in policy
Unintended consequences
Cobra effect
Seen and unseen
Chesterton's fence
Economic freedom
Property rights
Rule of law
Corruption
Institutions matter
Why nations fail
The Industrial Revolution
The Great Depression
The New Deal
Bretton Woods
The Marshall Plan
Post-war boom
1970s stagflation
Volcker shock
Reaganomics
Thatcherism
China's rise
Japan's lost decades
The euro
Brexit economics
The 2008 financial crisis
The pandemic economy
Great Resignation
Quiet quitting
Vibecession
Cost of living crisis
K-shaped recovery
Lipstick effect
Big Mac index
Skyscraper index
Hemline index
Misery index
Doughnut economics
Post-scarcity
Abundance agenda
`),

  stocks: lines(`
Bull market
Bear market
Market correction
Market crash
Stock split
Reverse stock split
Dividends
Dividend yield
Dividend aristocrats
Buybacks
Earnings season
Earnings per share
Price-to-earnings ratio
Forward P/E
PEG ratio
Price-to-book
Price-to-sales
Market cap
Small caps
Mid caps
Large caps
Mega caps
Penny stocks
Blue-chip stocks
Growth stocks
Value stocks
Income stocks
Cyclical stocks
Defensive stocks
Meme stocks
Momentum investing
Value investing
Growth investing
Contrarian investing
Index funds
ETFs
Mutual funds
Expense ratios
Active vs passive
Stock picking
Buy and hold
Day trading
Swing trading
Scalping
Paper trading
Market orders
Limit orders
Stop-loss orders
Trailing stops
Bid-ask spread
Liquidity
Volume
Volatility
The VIX
Beta
Alpha
Sharpe ratio
Drawdown
Short selling
Short squeeze
Gamma squeeze
Margin trading
Margin calls
Leverage
Options
Call options
Put options
Covered calls
Cash-secured puts
Implied volatility
Theta decay
The Greeks
Zero-day options
Futures
Pre-market trading
After-hours trading
Circuit breakers
Halted trading
IPOs
Direct listings
SPACs
Lock-up expiration
Secondary offerings
Share dilution
Insider trading
Insider buying
13F filings
Form 10-K
Earnings calls
Forward guidance
Earnings surprise
Whisper numbers
Analyst ratings
Price targets
Downgrades
Sell-side vs buy-side
Hedge funds
Market makers
Payment for order flow
High-frequency trading
Dark pools
Flash crashes
Algorithmic trading
Robo-advisors
Retail investors
Robinhood generation
WallStreetBets
Diamond hands
Paper hands
FOMO
Buy the dip
Catching a falling knife
Dead cat bounce
Bull trap
Bear trap
Capitulation
Bottom fishing
Timing the market
Time in the market
Dollar-cost averaging into stocks
Lump sum investing
Rebalancing
Asset allocation
Sector rotation
Tech stocks
Bank stocks
Energy stocks
Healthcare stocks
Consumer staples
Utilities
Real estate stocks
REITs
Semiconductor stocks
Defense stocks
Sin stocks
ESG investing
Greenwashing
Activist investors
Proxy fights
Shareholder letters
Annual meetings
Voting shares
Dual-class shares
Stock-based compensation
Employee stock options
Golden parachutes
CEO pay ratio
Corporate governance
Mergers and acquisitions
Hostile takeovers
Leveraged buyouts
Spin-offs
Poison pills
Stock exchanges
NYSE vs Nasdaq
The S&P 500
The Dow Jones
The Nasdaq 100
The Russell 2000
The Magnificent Seven
FAANG
Index concentration
Equal-weight indexes
International stocks
Emerging market stocks
Chinese stocks
Japanese stocks
European stocks
Currency risk in stocks
ADRs
Stock buyback debates
The efficient market hypothesis
Random walk theory
Behavioral finance
Herd mentality
Recency bias
Confirmation bias in investing
Overconfidence
Survivorship bias
Home country bias
Mean reversion
Momentum effect
January effect
Sell in May
Santa Claus rally
Window dressing
Triple witching
Technical analysis
Fundamental analysis
Moving averages
Support and resistance
Head and shoulders
Candlestick charts
RSI
MACD
Golden cross
Death cross
Fibonacci retracement
Elliott wave theory
Chart patterns
Discounted cash flow
Intrinsic value
Margin of safety
Economic moats
Return on equity
Return on invested capital
Free cash flow
Operating margin
Gross margin
Revenue growth
Earnings quality
Accounting tricks
Non-GAAP earnings
Stock-based comp dilution
Debt-to-equity
Interest coverage
Credit ratings
Bankruptcy and stocks
Delisting
Fallen angels
Turnaround stocks
Ten-baggers
Compounders
Quality investing
Dividend growth investing
Dividend traps
Value traps
Bubbles
Irrational exuberance
The dot-com bubble
Black Monday 1987
The 2020 crash
The 2022 bear market
AI stock boom
Nvidia's rise
GameStop saga
Tesla valuation
Berkshire Hathaway
Warren Buffett
Charlie Munger
Peter Lynch
Benjamin Graham
Cathie Wood
Michael Burry
Jim Simons
Ray Dalio
Stock tips
Finfluencers
Pump and dump
Stock fraud
Enron
Short seller reports
Market manipulation
Spoofing
The SEC
Retail flows
Passive investing bubble
Index rebalancing
Stock market as economy
Wall Street vs Main Street
Fed and stocks
Rate cuts and stocks
Earnings recession
Stock valuations today
Shiller CAPE ratio
Buffett indicator
Equity risk premium
Stocks vs bonds
Stocks vs real estate
Stocks vs gold
Stocks vs crypto
Portfolio diversification
Concentrated bets
Position sizing
Risk tolerance
Investing horizon
Selling discipline
Tax-loss harvesting
Wash sale rule
Capital gains tax
Fractional shares
Commission-free trading
Gamification of trading
Investing apps
First stock you'd buy
Stock you'd never sell
Investing in what you know
Circle of competence
Mr. Market
Price vs value
Patience as an edge
`),

  finance: lines(`
Compound interest
Emergency fund
Budgeting
The 50/30/20 rule
Zero-based budgeting
Envelope budgeting
Pay yourself first
Lifestyle creep
Living below your means
Frugality
Minimalism and money
Net worth
Cash flow
Credit scores
Credit cards
Credit card debt
Balance transfers
Buy now, pay later
Payday loans
Debt snowball
Debt avalanche
Debt consolidation
Good debt vs bad debt
Mortgages
Fixed vs variable rates
Refinancing
Down payments
Renting vs buying
House hacking
Home equity
Student loans
Car loans
Leasing vs buying a car
Insurance
Life insurance
Term vs whole life
Health insurance
Deductibles
Disability insurance
Renters insurance
Umbrella insurance
Self-insurance
Retirement planning
401(k)
Employer match
Roth IRA
Traditional IRA
Backdoor Roth
HSA
Pension plans
The 4% rule
FIRE movement
Lean FIRE
Fat FIRE
Coast FIRE
Barista FIRE
Early retirement
Retirement age
Sequence of returns risk
Annuities
Social Security timing
Required minimum distributions
Estate planning
Wills and trusts
Generational wealth
Inheritance
Financial literacy
Money and happiness
Money mindset
Scarcity mindset
Money scripts
Keeping up with the Joneses
Status spending
Impulse buying
Retail therapy
Subscription creep
Latte factor
Opportunity cost of spending
Saving vs investing
High-yield savings
Certificates of deposit
Treasury bills
Bonds
Bond yields
Bond ratings
Junk bonds
Municipal bonds
I bonds
TIPS
Duration risk
Fixed income
Real estate investing
Rental properties
Landlording
Flipping houses
Commercial real estate
Gold
Silver
Commodities
Cryptocurrency
Bitcoin
Ethereum
Stablecoins
DeFi
NFTs
Crypto exchanges
Crypto custody
Bitcoin ETFs
Digital gold
Blockchain beyond crypto
Banking
Neobanks
Fintech
Open banking
Digital wallets
Mobile payments
Cross-border payments
Remittance apps
Banking the unbanked
Microfinance
Credit unions
Investment banking
Private equity
Venture capital
Hedge fund fees
Family offices
Wealth management
Financial advisors
Fiduciary duty
Fee-only advisors
Robo-advice
Asset management
Sovereign wealth funds
Endowments
Pension funds
Insurance companies as investors
Private credit
Shadow banking
Securitization
Mortgage-backed securities
Credit default swaps
Derivatives
Hedging
Arbitrage
Leverage ratios
Liquidity risk
Counterparty risk
Systemic risk
Stress tests
Basel rules
Financial regulation
Dodd-Frank
Glass-Steagall
Consumer protection
Predatory lending
Financial scams
Ponzi schemes
Pyramid schemes
Identity theft
Phishing scams
Romance scams
Elder financial abuse
Fraud detection
Money laundering
Know your customer
Cash vs card
Rewards credit cards
Credit card churning
Cashback
Points and miles
Financial independence
Side income
Passive income
Dividend income
Multiple income streams
Negotiating salary
Raises and promotions
Job hopping for pay
Total compensation
Equity compensation
RSUs
Stock options at startups
Taxes
Tax brackets
Tax refunds
Tax deductions
Tax credits
Self-employment tax
Freelancer finances
Quarterly taxes
Accounting basics
Balance sheets
Income statements
Cash flow statements
Assets vs liabilities
Working capital
Depreciation
Amortization
EBITDA
Corporate finance
Cost of capital
Capital structure
Valuation
Discount rates
Time value of money
Present value
Future value
Risk and return
Diversification
Correlation
Modern portfolio theory
Rebalancing a portfolio
Target-date funds
Three-fund portfolio
Lazy portfolios
All-weather portfolio
Risk parity
Inflation hedges
Cash drag
Behavioral money mistakes
Sunk cost in finance
Financial goals
SMART money goals
Net worth tracking
Money conversations with partners
Joint accounts
Prenups
Divorce finances
Kids and money
Allowances
Teaching kids about money
College savings
529 plans
Financial independence for women
The gender pay gap
The pink tax
Retirement savings gap
Cost of raising a child
Wedding costs
Cost of pets
Car ownership costs
Commuting costs
Moving for money
Cost of living arbitrage
Geoarbitrage
Digital nomad finances
Travel hacking
Luxury vs value
Buy it for life
Cheap vs frugal
Delayed gratification
The marshmallow test
Money and stress
Financial therapy
Financial anxiety
Money taboos
Talking about salary
Pay transparency
Wealth signaling
Old money vs new money
Lottery winners
Windfalls
Sudden wealth syndrome
Philanthropy
Effective altruism
Donor-advised funds
Charitable giving
Impact investing
Microloans
Money in relationships
Financial infidelity
Bankruptcy
Collections agencies
Credit repair
Second chances with money
`),

  ai: lines(`
Artificial intelligence
Machine learning
Deep learning
Neural networks
Large language models
Generative AI
Transformers
Attention mechanism
Training data
Data labeling
Synthetic data
Prompt engineering
Prompt injection
Context window
Tokens
Embeddings
Vector databases
Retrieval-augmented generation
Fine-tuning
Reinforcement learning
RLHF
Hallucinations
Model alignment
AI safety
Existential risk
Superintelligence
AGI timelines
The Turing test
The Chinese room
Consciousness in machines
AI rights
AI personhood
Black box models
Explainable AI
Algorithmic bias
Fairness in AI
Facial recognition
Surveillance AI
Deepfakes
Voice cloning
AI-generated art
AI music
AI writing
AI and copyright
Fair use and training
Data scraping
Data privacy
Open-source models
Closed models
Model weights
Compute
GPUs
The chip war
Data centers
AI energy use
Scaling laws
Bigger models
Small models
Edge AI
On-device AI
AI agents
Autonomous agents
Tool use
Multimodal AI
Computer vision
Speech recognition
Natural language processing
Recommendation algorithms
The algorithm feed
Filter bubbles
Chatbots
AI companions
AI therapists
AI tutors
AI in education
Cheating with AI
AI detectors
AI in healthcare
AI diagnosis
Drug discovery
Protein folding
AI in science
AI in law
AI judges
AI in finance
Algorithmic trading AI
Credit scoring algorithms
AI in hiring
Resume screening
AI in marketing
Personalized ads
AI customer service
AI coding assistants
Vibe coding
The end of programming
Software engineers and AI
AI and jobs
Jobs AI can't replace
Augmentation vs automation
Copilots
The AI productivity paradox
AI adoption at work
Shadow AI
AI literacy
AI regulation
The EU AI Act
AI governance
AI audits
AI and elections
Misinformation
Synthetic media
Watermarking AI content
Content authenticity
Dead internet theory
AI slop
Model collapse
Benchmarks
Benchmark gaming
Emergent abilities
Reasoning models
Chain of thought
Test-time compute
Self-driving cars
Robotaxis
Humanoid robots
Robotics
Drones
AI in warfare
Autonomous weapons
AI arms race
US vs China in AI
AI nationalism
Open-source vs safety
AI moats
Foundation model companies
AI startups
AI wrappers
AI bubble
AI valuations
AI hype cycle
Gartner hype cycle
AI winters
History of AI
Alan Turing
Deep Blue
AlphaGo
ChatGPT moment
AI and creativity
Human-AI collaboration
Centaur chess
AI as a coworker
AI as a teacher
AI as a friend
Loneliness and AI
Anthropomorphism
The ELIZA effect
Uncanny valley
AI personalities
AI sycophancy
AI and trust
Overreliance on AI
Automation bias
Deskilling
Cognitive offloading
Will AI make us dumber
AI and attention spans
Search engines vs chatbots
The future of search
AI and journalism
AI and Hollywood
AI actors
AI influencers
Virtual idols
Digital twins
Brain-computer interfaces
Neuralink
AI and longevity
AI in agriculture
AI in climate
Smart cities
Internet of things
Smart homes
Voice assistants
Wearables
AI glasses
The next interface
Natural language as UI
No-code tools
AI for small business
AI pricing models
Cost per token
Inference costs
Open weights economics
Data as the new oil
Data moats
Proprietary data
Synthetic users
Simulations
AI in gaming
NPCs with brains
Procedural generation
AI ethics boards
Responsible AI
Red teaming
Jailbreaking
AI misuse
AI and cybersecurity
AI-powered scams
Bots on social media
CAPTCHAs
Proof of personhood
Universal basic income and AI
Post-work society
Meaning without work
The singularity
Transhumanism
Effective accelerationism
AI doomers
AI optimists
Techno-optimism
Luddites
Moore's law
Exponential growth
Compute as currency
Quantum computing
Cloud computing
Open source software
Tech debt
Legacy systems
Edge cases
Garbage in, garbage out
Overfitting
Generalization
Few-shot learning
Transfer learning
Continual learning
Memory in AI
World models
Embodied AI
Intelligence explosion
The alignment problem
Paperclip maximizer
Instrumental convergence
Interpretability
Mechanistic interpretability
AI constitutions
Values in machines
Who owns AI output
AI and art school
Prompt as craft
AI-native companies
AI-first workflows
The one-person unicorn
`),

  entrepreneurship: lines(`
Skin in the game
First customer
Cash is oxygen
Founder mode
Saying no
Distribution
Unit economics
Moat
Bootstrapping
Product-market fit
Reputation capital
Sweat equity
Hustle culture
Minimum viable product
Runway
Seed round
Series A
Growth hacking
Churn
Network effects
Burn rate
Traction
Pivot
Founder-market fit
Beachhead market
Viral loop
Demo day
Product debt
Startup ideas
Solving your own problem
Scratch your own itch
Painkillers vs vitamins
Talking to customers
The Mom Test
Customer discovery
Jobs to be done
Validating an idea
Pre-selling
Waitlists
Landing pages
Building in public
Indie hackers
Solopreneurs
Micro-SaaS
Side hustles
Quitting your job
Fear of failure
Failing fast
Fail forward
Resilience
Grit
Rejection
Founder burnout
Founder loneliness
Co-founders
Co-founder breakups
Equity splits
Vesting
Hiring your first employee
Hiring slow, firing fast
A-players
Company culture
Remote teams
Startup perks
Founder salaries
Raising money
Pitch decks
The elevator pitch
Investors
Angel investors
Venture capital model
Power law returns
Unicorns
Decacorns
Zombie startups
Down rounds
Valuations
Term sheets
Liquidation preferences
Dilution
SAFEs
Convertible notes
Crowdfunding
Revenue-based financing
Grants
Bank loans for business
Profitability
Default alive
Ramen profitable
Growth at all costs
Blitzscaling
Lean startup
Build-measure-learn
Iteration
Speed as advantage
Shipping
Perfectionism
Done is better than perfect
Focus
Doing things that don't scale
Founder-led sales
Cold outreach
Sales funnels
Conversion rates
Customer acquisition cost
Lifetime value
LTV to CAC
Payback period
Pricing
Raising prices
Freemium
Free trials
Subscription models
Marketplaces
Two-sided markets
Chicken and egg problem
Platforms
Aggregators
SaaS
B2B vs B2C
Enterprise sales
Self-serve
Product-led growth
Community-led growth
Word of mouth
Referral programs
Brand building
Personal brand
Storytelling
Content marketing
SEO
Paid ads
Influencer marketing
Social media marketing
Going viral
Positioning
Category creation
Blue ocean strategy
Red ocean
Competition
Competitors as validation
Copycats
First-mover advantage
Second-mover advantage
Fast followers
Timing
Why now
Market size
TAM, SAM, SOM
Niches
Riches in niches
Vertical software
Horizontal products
Disruption
Innovator's dilemma
Incumbents
Startups vs corporations
Intrapreneurship
Franchising
Small business
Main Street businesses
Buying a business
Search funds
Family businesses
Succession
Exits
Acquisitions
Acqui-hires
Going public
Lifestyle businesses
Calm companies
Bootstrapped vs funded
Customer obsession
Customer support as product
Feedback loops
Metrics that matter
Vanity metrics
North star metric
OKRs
Product roadmaps
Feature creep
Simplicity
Design as advantage
User experience
Onboarding
Retention
Habit-forming products
Delight
Operations
Systems and processes
Delegation
Outsourcing
Virtual assistants
Automation for founders
Time management for founders
Decision fatigue
Making hard decisions
Reversible decisions
Two-way doors
Strategy vs tactics
Vision
Mission statements
Values
Leadership
Managing people
Giving feedback
Firing someone
Conflict resolution
Negotiation
Partnerships
Suppliers
Inventory
Logistics
E-commerce
Dropshipping
Direct-to-consumer
Amazon sellers
Etsy shops
Print on demand
Physical products
Manufacturing
Patents
Trademarks
Intellectual property
Legal structures
LLC vs corporation
Contracts
Compliance
Accounting for founders
Cash flow management
Payroll
Taxes for small business
Business insurance
Mentors
Advisors
Accelerators
Y Combinator
Incubators
Networking
Cold emails
Warm intros
Founder communities
Founder myths
The garage myth
Overnight success
Luck vs skill
Survivorship bias in startups
Dropping out
Young founders
Older founders
Immigrant founders
Female founders
Solo founders
Serial entrepreneurs
Second-time founders
Hard tech
Deep tech
Climate tech
Health tech
Edtech
Proptech
Creator businesses
Newsletters
Courses
Communities as businesses
Agencies
Productized services
Consulting
Freelancing to founding
Selling shovels
Picks and shovels
Boring businesses
Unsexy industries
Local businesses
Restaurants
Coffee shops
Gyms as businesses
Retail stores
Pop-up shops
Side projects
Weekend projects
Hackathons
Open source businesses
Ethics in business
Social enterprises
B Corps
Profit vs purpose
Exit vs legacy
Founder identity
Life after exit
`),
};

// Deep research: meatier topics worth looking up before you speak.
window.TOPICS.deep = lines(`
The tulip mania of 1637
The South Sea Bubble
The Mississippi Bubble
The Panic of 1907
The 1929 crash
The Great Depression's causes
The Smoot-Hawley tariff
The Bretton Woods system
The Nixon shock
The 1973 oil crisis
The Volcker disinflation
The Plaza Accord
Japan's asset bubble
The 1997 Asian financial crisis
The 1998 Russian default
Long-Term Capital Management
The dot-com crash
Enron's collapse
WorldCom fraud
The 2008 subprime crisis
Lehman Brothers' fall
The Eurozone debt crisis
Greece's bailout
Iceland's banking collapse
Zimbabwe's hyperinflation
Weimar hyperinflation
Venezuela's economic collapse
Argentina's debt cycles
The 2010 Flash Crash
The Bernie Madoff scheme
The LIBOR scandal
Archegos Capital's implosion
The FTX collapse
Terra/Luna's crash
Silicon Valley Bank's failure
Credit Suisse's downfall
Evergrande and China property
The GameStop short squeeze
The Theranos fraud
WeWork's failed IPO
Wirecard's fraud
The Volkswagen short squeeze
The Hunt brothers' silver corner
The Swiss franc unpegging
Brexit's economic impact
The 2022 UK gilt crisis
The COVID-19 market crash
The 2021-23 inflation surge
The Marshall Plan's effects
The Asian Tigers' growth
China's economic reform under Deng
India's 1991 liberalization
Chile's economic model
Ireland's Celtic Tiger
Singapore's development model
South Korea's chaebols
Germany's Wirtschaftswunder
The Soviet planned economy
Estonia's digital economy
Dubai's diversification
Norway's oil fund
Botswana's diamond economy
Rwanda's economic growth
Bangladesh's garment industry
Kenya's M-Pesa
Nigeria's fintech boom
Vietnam's export growth
Mexico's NAFTA era
The Tragedy of the commons in fisheries
The Jevons paradox in energy
Goodhart's law in practice
The cobra effect in colonial India
The Lindy effect
Gresham's law in history
The Cantillon effect
The Triffin dilemma
The impossible trinity
Mundell-Fleming model
Ricardian equivalence
Rational expectations
The Lucas critique
Kondratiev waves
Minsky's financial instability hypothesis
Reflexivity (George Soros)
The Fisher equation
The Taylor rule
The quantity theory of money
Hotelling's rule
The Coase theorem
Arrow's impossibility theorem
Pareto efficiency
The Kuznets curve
The Solow growth model
Endogenous growth theory
Thomas Piketty's r > g
Thorstein Veblen's leisure class
Mancur Olson's collective action
Elinor Ostrom's commons
Hayek's knowledge problem
The socialist calculation debate
Public choice theory
Prospect theory
The endowment effect
The winner's curse
The Keynesian beauty contest
Kelly criterion
Black-Scholes model
Capital asset pricing model
The Fama-French factors
Efficient market hypothesis critiques
Adaptive markets hypothesis
The Dogs of the Dow
The Coffee Can Portfolio
Buffett's Berkshire strategy
Graham's net-nets
Peter Lynch's Magellan Fund
Renaissance Technologies' Medallion Fund
Bridgewater's principles
The Yale endowment model
Vanguard and the index fund revolution
John Bogle's legacy
The rise of BlackRock
Passive investing's market impact
The history of the S&P 500
Nifty Fifty stocks
The Kodak decline
Blockbuster vs Netflix
Nokia's fall
BlackBerry's fall
Apple's comeback in 1997
Amazon's flywheel
Costco's business model
Walmart's logistics
Toyota Production System
McDonald's real estate model
Starbucks' third place
Nike's brand strategy
IKEA's cost model
Zara's fast fashion supply chain
Netflix's pivot to streaming
Microsoft under Satya Nadella
Intel's missed mobile shift
Nvidia's CUDA moat
TSMC's foundry model
ASML's monopoly
Google's ad business
Meta's pivot to the metaverse
Twitter's acquisition
Tesla's direct sales model
SpaceX's reusable rockets
Stripe's developer-first growth
Shopify vs Amazon
Airbnb's early growth hacks
Uber's subsidy war
DoorDash's market strategy
Slack's product-led growth
Zoom's pandemic boom
Peloton's boom and bust
Dropbox's referral program
Instagram's acquisition by Facebook
WhatsApp's $19B sale
OpenAI's capped-profit structure
The ChatGPT launch
DeepMind's AlphaFold
The transformer paper
The ImageNet moment
The history of AI winters
Moravec's paradox
The bitter lesson
Scaling hypothesis
The AI chip export controls
AI's energy demand
Copyright lawsuits against AI labs
The EU AI Act's risk tiers
Algorithmic pricing collusion
The Cambridge Analytica scandal
Section 230
The Google antitrust case
Microsoft's 1990s antitrust case
The breakup of AT&T
Standard Oil's breakup
The East India Company
The Medici bank
The Dutch East India Company's IPO
The invention of double-entry bookkeeping
The history of central banking
The founding of the Federal Reserve
The history of the credit card
The invention of the ATM
The birth of the 401(k)
Bitcoin's whitepaper
The Mt. Gox hack
Ethereum's DAO hack
El Salvador's Bitcoin experiment
Central bank digital currency in China
The rise of Revolut
Klarna and buy now, pay later
Robinhood's business model
Payment for order flow debate
The Gig economy and Prop 22
Amazon's labor practices
The Great Resignation's causes
Four-day work week trials
Finland's basic income experiment
Universal basic income pilots
Minimum wage studies (Card-Krueger)
Rent control studies
Congestion pricing in London
Singapore's housing model
Japan's aging economy
China's one-child policy economics
Opioid crisis economics
The economics of the drug war
Carbon pricing in Sweden
The Inflation Reduction Act
OPEC's history
The shale revolution
Saudi Aramco's IPO
The Suez Canal blockage of 2021
Pandemic supply chain crisis
The semiconductor shortage
Diamond pricing and De Beers
The Big Mac index method
Behavioral nudges in pensions
The marshmallow test's replication
The Ultimatum game
The Dictator game
Muhammad Yunus and Grameen Bank
Y Combinator's model
The Theranos lessons
Zappos' culture experiment
Patagonia's ownership change
Basecamp's calm company
Mailchimp's bootstrapped exit
Spanx's bootstrapped rise
Red Bull's marketing machine
Dyson's 5,127 prototypes
Duolingo's growth tactics
Canva's global growth
Figma's failed Adobe deal
`);
