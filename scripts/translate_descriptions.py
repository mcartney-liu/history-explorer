"""
Batch translate entity descriptions and relationship descriptions
from English to Chinese in the data JSON files.
"""
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'examples')
SKIP_TOPICS = {'china_civilization_v1'}

# Comprehensive translation table for entity descriptions
DESC_TRANSLATIONS = {
    # === roman_empire ===
    'First Roman emperor, reigned from 27 BC.': '罗马第一位皇帝，自公元前27年起统治。',
    'A Mediterranean civilization that dominated the ancient world.': '统治古代世界的地中海文明。',
    'The monotheistic faith that spread through the empire.': '传播于整个帝国的唯一神信仰。',
    'Roman general and dictator whose crossing of the Rubicon ended the Republic.': '罗马将领与独裁官，跨过卢比孔河终结了共和国。',
    'City on the Bosporus founded by Constantine as the new imperial capital.': '君士坦丁在博斯普鲁斯海峡建立的新帝国首都。',
    '313 AD proclamation granting Christians legal toleration in the Roman Empire.': '公元313年授予基督徒在罗马帝国合法地位的公告。',
    'The collapse of the Roman Republic through civil wars (49-27 BC), culminating in': '罗马共和国通过内战（公元前49-27年）走向崩溃，最终',
    'A period of relative peace and stability across the Roman Empire lasting approxi': '罗马帝国全境持续约两百年的相对和平与稳定时期。',
    'The gradual decline and eventual collapse of the Western Roman Empire in 476 AD,': '西罗马帝国于公元476年逐渐衰落并最终崩溃，',
    'Roman emperor (306-337 AD) who legalized Christianity via the Edict of Milan.': '罗马皇帝（公元306-337年），通过米兰敕令使基督教合法化。',
    'A Roman emperor who established the principate and ushered in the Pax Romana.': '罗马皇帝，建立元首制并开启了罗马和平时期。',
    'The Roman institution that advised the emperor and governed the state.': '罗马的国家机构，为皇帝提供建议并治理国家。',
    'The event that marks the founding of the Roman Empire under Augustus.': '标志着奥古斯都治下罗马帝国建立的事件。',
    'The senate building in the Roman Forum, symbolic heart of the Republic.': '罗马广场上的元老院建筑，共和国的象征心脏。',

    # === silk_road ===
    'The network of Central Asian trade routes carrying silk, paper, and ideas betwee': '连接中国与西方的中亚贸易路线网络，运送丝绸、纸张与思想。',
    'The Chinese imperial dynasty (206 BC-220 CE) that expanded westward and produced': '中国帝国王朝（公元前206年-公元220年），向西扩张并生产',
    'Han envoy whose westward missions (138-126 BC) opened diplomatic and trade conta': '汉朝使者，公元前138-126年西行开辟了与中亚的外交和贸易联系。',
    'The Han capital at the eastern end of the Silk Road, terminus of the overland ro': '汉朝都城，位于丝绸之路东端，陆路路线的终点。',
    'The Han-era technique for making paper from mulberry bark and rags, which spread': '汉代用桑树皮和破布造纸的技术，沿丝路传播。',
    "Zhang Qian's return in c. 126 BC established the first documented overland link": '张骞约公元前126年返回，建立了首个有记载的陆路联系。',
    'The Han Chinese technique of rearing silkworms and weaving silk, a luxury that s': '汉人养蚕织丝的技术，一种沿丝路传播的奢侈品。',
    'Oasis city in Transoxiana, a major Silk Road caravan hub.': '河中地区的绿洲城市，丝路重要商队枢纽。',
    'Oasis town at the foot of the Pamirs where northern and southern Silk Roads met.': '帕米尔山麓的绿洲城镇，丝路南北线交汇处。',
    'Han general who re-opened and secured the Western Regions for the Silk Road.': '汉朝将领，重新打通并巩固了西域丝绸之路。',
    'Glass production traded west-to-east along the Silk Road routes.': '沿丝路从西向东传播的玻璃制造技术。',
    'The Sinitic language family spoken across Han China, linking travelers and texts': '汉地通行的汉语族语言，连接旅行者与文献。',

    # === greek_philosophy ===
    'Athenian philosopher who taught Plato and pioneered the Socratic method.': '雅典哲学家，教授柏拉图并开创了苏格拉底问答法。',
    'Student of Socrates, founder of the Academy, author of the Theory of Forms.': '苏格拉底的学生，学园的创始人，《理型论》的作者。',
    'Student of Plato who taught Alexander the Great and founded the Lyceum.': '柏拉图的学生，教导亚历山大大帝并创立了吕刻昂学园。',
    'The first institution of higher learning in the Western world, founded by Plato.': '西方世界第一所高等学府，由柏拉图创立。',
    'The school founded by Aristotle where he lectured on logic, biology, and ethics.': '亚里士多德创立的学校，他在此讲授逻辑学、生物学和伦理学。',
    'The method of cooperative argumentative dialogue between individuals.': '个体之间合作辩论对话的方法。',
    "Plato's philosophical concept that the physical world is a shadow of ideal Forms.": '柏拉图的哲学概念，认为物质世界是理想理型的影子。',
    "Aristotle's ethical doctrine that virtue lies in the mean between two extremes.": '亚里士多德的伦理学说，认为德性在于两极之间的中庸。',
    'The art of effective reasoning and structured argumentation, formalized by Aristotle.': '有效推理和结构化论证的艺术，由亚里士多德系统化。',
    'The study of the fundamental nature of reality, being, and existence.': '研究现实、存在与实有之根本性质的学问。',
    'The branch of philosophy that studies the nature and scope of knowledge.': '研究知识的本质和范围的哲学分支。',
    'The spread of Greek culture, language, and philosophy across the Mediterranean.': '希腊文化、语言和哲学在地中海地区的传播。',
    'The body of philosophical thought developed in the Greek-speaking world.': '希腊语世界中发展的哲学思想体系。',
    'The cultural and intellectual flowering of Athens during the 5th century BC.': '公元前5世纪雅典文化和思想的繁荣时期。',
    'The Greek city-state that became the intellectual center of philosophy.': '成为哲学思想中心的希腊城邦。',

    # === hellenistic_world ===
    'King of Macedon (336-323 BC) who conquered the Persian Empire and spread Greek c': '马其顿国王（公元前336-323年），征服波斯帝国并传播希腊文化。',
    'Ancient Egyptian capital under the Ptolemies, a Hellenistic center of learning.': '托勒密王朝下的古埃及首都，希腊化世界的学术中心。',
    'The last ruling dynasty of Egypt (305-30 BC), descended from Alexander\'s general': '埃及最后一个统治王朝（公元前305-30年），源自亚历山大的将军',
    'The largest library of the ancient world, located in Alexandria, Egypt.': '古代世界最大的图书馆，位于埃及亚历山大城。',
    'The lighthouse of Alexandria, one of the Seven Wonders of the Ancient World.': '亚历山大灯塔，古代世界七大奇迹之一。',
    'Alexander\'s campaigns (334-323 BC) that created a vast empire from Greece to Ind': '亚历山大的征战（公元前334-323年），建立了从希腊到印度的庞大帝国。',
    'The city-states and kingdoms that inherited Alexander\'s fragmented empire.': '继承亚历山大分裂帝国的各城邦和王国。',
    'A blend of Greek and Near Eastern cultures that emerged after Alexander\'s conque': '亚历山大征服后出现的希腊与近东文化融合。',
    'The empire and period of Greek dominance from Alexander to the Roman conquest.': '从亚历山大到罗马征服期间的希腊主导帝国和时期。',

    # === early_christianity ===
    'A Jewish teacher whose followers proclaimed him the Christ; central to Christian': '犹太教师，其追随者宣称他为基督；基督教信仰的核心。',
    'Former persecutor who became the chief missionary carrying the faith to the Gent': '前迫害者，成为将信仰传播到外邦人的首席传教士。',
    'The city of Jesus\'s ministry, death, and the early church\'s birth at Pentecost.': '耶稣传道、受难和五旬节早期教会诞生的城市。',
    'The execution of Jesus under Pontius Pilate, the pivotal event of the faith.': '耶稣在本丢·彼拉多治下被处决，信仰的关键事件。',
    "Paul's travels founding congregations across Asia Minor and Greece.": '保罗在小亚细亚和希腊建立教会的旅程。',
    "The first communities of Jesus's followers, from Jerusalem to the Gentile world.": '耶稣追随者的最初群体，从耶路撒冷到外邦世界。',
    'The belief in bodily rising from the dead, central to Christian hope.': '相信肉身从死里复活，基督教希望的核心。',
    'A major hub where the followers of Jesus were first called Christians.': '耶稣追随者首次被称为基督徒的重要中心。',
    'The language of the early Christian scriptures and the lingua franca of the east.': '早期基督教经文的语言和东方通用语。',
    'The ruling class and infrastructure that the Christian message traversed.': '基督教信息所穿越的统治阶级和基础设施。',
    'The Jewish tradition that formed the matrix from which Christianity emerged.': '构成基督教诞生母体的犹太传统。',

    # === egypt_technology_religion ===
    'A reed-like plant that grew along the Nile and was used to make a writing surface': '沿尼罗河生长的芦苇状植物，用于制作书写表面。',
    'The ancient Egyptian script combining logographic and alphabetic elements.': '结合象形与字母元素的古埃及文字。',
    'Massive stone structures built as tombs for Egyptian pharaohs.': '为埃及法老建造的大型石质陵墓建筑。',
    'The sun-disk deity, elevated to supreme status during the reign of Akhenaten.': '太阳圆盘神祇，在阿肯那顿统治期间被提升为至高神。',
    'The ruler of ancient Egypt, considered a divine intermediary.': '古埃及的统治者，被视为神圣的中介者。',
    'The ancient Egyptian concept of truth, balance, order, and justice.': '古埃及的真理、平衡、秩序与正义观念。',
    'The ritual preservation of the dead, reflecting beliefs about the afterlife.': '保存死者的仪式，反映关于来世的信仰。',
    'A collection of spells and prayers to guide the deceased through the afterlife.': '引导逝者穿越来世的咒语和祷文集。',
    'The great river of Egypt that sustained its civilization and agriculture.': '维系埃及文明和农业的伟大河流。',
    'The indigenous religious tradition of ancient Egypt, centered on a pantheon of g': '古埃及的本土宗教传统，以众多神祇的万神殿为中心。',

    # === persian_empire ===
    'Founder of the Achaemenid Empire who conquered Babylon and freed the Jews.': '阿契美尼德帝国的创建者，征服巴比伦并释放犹太人。',
    'The vast empire of the Persian kings, the largest the world had yet seen.': '波斯诸王的庞大帝国，当时世界上最大的帝国。',
    'The administrative system of provinces (satrapies) used by the Persian Empire.': '波斯帝国使用的行省（总督区）行政体系。',
    'The religion founded by the prophet Zoroaster, emphasizing dualism of good and e': '先知琐罗亚斯德创立的宗教，强调善恶二元论。',
    'The ceremonial capital of the Achaemenid Empire, built by Darius I.': '大流士一世建造的阿契美尼德帝国礼仪首都。',
    'The conquest of the Persian Empire by Alexander the Great (334-330 BC).': '亚历山大大帝对波斯帝国的征服（公元前334-330年）。',
    'An ancient highway connecting the Persian capitals from Susa to Sardis.': '连接波斯诸都从苏萨到萨迪斯的古代大道。',

    # === ancient_india ===
    'The first empire to unify most of the Indian subcontinent (c. 322-185 BC).': '第一个统一大部分印度次大陆的帝国（约公元前322-185年）。',
    "Founder of the Maurya dynasty who overthrew the Nandas with Chanakya's aid.": '孔雀王朝的创建者，在考底利耶的帮助下推翻难陀王朝。',
    'Mauryan emperor who, after the Kalinga War, embraced Buddhism and spread dhamma.': '孔雀王朝皇帝，羯陵伽战争后皈依佛教并传播正法。',
    'The Mauryan capital at the confluence of the Ganges and Son rivers.': '孔雀王朝的都城，位于恒河与宋河交汇处。',
    'The teaching of Siddhartha Gautama on the cessation of suffering, spread across': '悉达多·乔达摩关于止息苦难的教义，传播于',
    'The historical Buddha who attained enlightenment under the Bodhi tree.': '在菩提树下觉悟的历史佛陀。',
    'The riverine heartland of early Indian civilization in modern Pakistan.': '早期印度文明的河流腹地，位于今巴基斯坦。',
    "Ashoka's brutal conquest of Kalinga that turned him to non-violence.": '阿育王对羯陵伽的残酷征服，使他转向非暴力。',
    'The cosmic law and duty at the heart of Indian religious and ethical thought.': '印度宗教和伦理思想核心的宇宙法则与义务。',
    'The age of the first Indian empire and its Buddhist flowering.': '第一个印度帝国及其佛教繁荣的时代。',
    'The classical age of India (c. 320-550 AD) under the Gupta dynasty.': '笈多王朝治下的印度古典时代（约公元320-550年）。',
    'Classical Sanskrit poet and playwright of the Gupta court.': '笈多宫廷的古典梵语诗人和剧作家。',
    'The place-value numeral system with zero, formalized in Gupta-era India.': '包含零的位值数字系统，在笈多时代印度正式形成。',
    'Gupta-era mathematician-astronomer who authored the Aryabhatiya.': '笈多时代的数学家-天文学家，著有《阿利耶毗陀论》。',
}

# Relationship description translations
REL_TRANSLATIONS = {
    'Augustus established the Roman Empire, transforming the Republic into a princip': '奥古斯都建立罗马帝国，将共和国转变为元首制。',
    'The Roman Empire was the dominant civilization of the ancient Mediterranean.': '罗马帝国是古代地中海地区的主导文明。',
    'Christianity spread throughout the Roman Empire, eventually becoming the state r': '基督教在罗马帝国全境传播，最终成为国教。',
    'Augustus ruled the Roman Empire as its first emperor.': '奥古斯都作为首任皇帝统治罗马帝国。',
    'The Roman Empire provided the political and cultural framework for Roman Civiliza': '罗马帝国为罗马文明提供了政治和文化框架。',
    'The Roman Empire provided the infrastructure through which Christianity spread.': '罗马帝国为基督教的传播提供了基础设施。',
    'Julius Caesar laid the foundation for the Roman Empire.': '尤利乌斯·凯撒奠定了罗马帝国的基础。',
    'The Roman Empire ruled over the Roman Civilization.': '罗马帝国统治着罗马文明。',
    'Constantine legalized Christianity in the Roman Empire.': '君士坦丁在罗马帝国使基督教合法化。',
    'The Roman Empire ended the Roman Republic.': '罗马帝国终结了罗马共和国。',
    'Jesus of Nazareth founded the Christian faith.': '拿撒勒的耶稣创立了基督教信仰。',
    'Paul the Apostle spread Christianity to the Gentiles.': '使徒保罗将基督教传播到外邦人。',
    'The Crucifixion of Jesus is the central event of Christian faith.': '耶稣受难是基督教信仰的核心事件。',
    "Paul's Missionary Journeys established Christian communities.": '保罗的传教旅程建立了基督徒群体。',
    'The Resurrection is the foundation of Christian hope.': '复活是基督教希望的基础。',
    'Antioch was a center of early Christianity.': '安条克是早期基督教的中心。',
    'Koine Greek was the language of the New Testament.': '通用希腊语是新约的语言。',
    'The Roman Empire provided the roads and peace for missionary travel.': '罗马帝国为传教旅行提供了道路与和平。',
    'Judaism provided the scriptural and theological roots of Christianity.': '犹太教为基督教提供了经文和神学根源。',
    'Jerusalem was the birthplace of the Christian church.': '耶路撒冷是基督教会的诞生地。',
    'Jesus was crucified under Roman authority.': '耶稣在罗马权柄下被钉十字架。',
    'Augustus established the Pax Romana.': '奥古斯都建立了罗马和平。',
    'The Roman Senate was the governing body of the Republic.': '罗马元老院是共和国的治理机构。',
    'The Senate functioned within the Roman Empire.': '元老院在罗马帝国内运作。',
    'Augustus ruled the Roman Empire.': '奥古斯都统治罗马帝国。',
    'The Pax Romana provided stability for the Roman Empire.': '罗马和平为罗马帝国提供了稳定。',
    'The Edict of Milan legalized Christianity.': '米兰敕令使基督教合法化。',
    'Constantine issued the Edict of Milan.': '君士坦丁颁布了米兰敕令。',
    'Constantine ruled from Constantinople.': '君士坦丁在君士坦丁堡统治。',
    'The End of the Roman Republic led to the Roman Empire.': '罗马共和国的终结导致了罗马帝国的建立。',
    'Julius Caesar triggered the End of the Roman Republic.': '尤利乌斯·凯撒引发了罗马共和国的终结。',
    'Augustus completed the End of the Roman Republic.': '奥古斯都完成了罗马共和国的终结。',
    'Augustus initiated the Pax Romana.': '奥古斯都开启了罗马和平。',
    'Christianity spread within the Roman Empire.': '基督教在罗马帝国内传播。',
    'Constantine promoted Christianity.': '君士坦丁推动了基督教。',
    'The Fall of the Western Roman Empire ended Roman rule in the west.': '西罗马帝国的灭亡终结了罗马在西方的统治。',
    'The Roman Empire declined into the Fall of the Western Roman Empire.': '罗马帝国衰落，最终导致西罗马帝国灭亡。',
    'Rome was the capital of the Roman Empire.': '罗马是罗马帝国的首都。',
    'Rome was the center of the Roman Republic.': '罗马是罗马共和国的中心。',
    'Augustus ruled from Rome.': '奥古斯都在罗马统治。',
    'The Roman Senate met in Rome.': '罗马元老院在罗马集会。',
    'The End of the Roman Republic occurred in Rome.': '罗马共和国的终结发生在罗马。',
    'The Silk Road connected the Roman Empire with Han China.': '丝绸之路连接了罗马帝国与汉朝。',
    'The Han Dynasty produced silk traded along the Silk Road.': '汉朝生产了沿丝绸之路贸易的丝绸。',
    'Zhang Qian opened the Silk Road.': '张骞开辟了丝绸之路。',
    "Chang'an was the eastern terminus of the Silk Road.": '长安是丝绸之路的东端终点。',
    'Papermaking spread from China along the Silk Road.': '造纸术从中国沿丝绸之路传播。',
    'The Silk Road was opened by Zhang Qian.': '丝绸之路由张骞开辟。',
    'The Silk Road carried silk from China to the west.': '丝绸之路将丝绸从中国运往西方。',
    'Samarkand was a key hub on the Silk Road.': '撒马尔罕是丝绸之路的关键枢纽。',
    'Kashgar was a Silk Road crossroads.': '喀什是丝绸之路的十字路口。',
    'Ban Chao secured the Silk Road.': '班超巩固了丝绸之路。',
    'Glassmaking traveled along the Silk Road.': '玻璃制造沿丝绸之路传播。',
    'Chinese language linked Silk Road travelers.': '汉语连接了丝绸之路的旅行者。',
    'The Silk Road passed through Samarkand.': '丝绸之路经过撒马尔罕。',
    'The Silk Road passed through Kashgar.': '丝绸之路经过喀什。',
    'Zhang Qian traveled from Chang\'an.': '张骞从长安出发。',
    'The Silk Road ended at Chang\'an.': '丝绸之路止于长安。',
    'The Silk Road carried Chinese language and culture.': '丝绸之路传播了汉语和中国文化。',
    'Socrates taught Plato.': '苏格拉底教导柏拉图。',
    'Plato taught Aristotle.': '柏拉图教导亚里士多德。',
    'Plato founded the Academy.': '柏拉图创立了学园。',
    'Aristotle founded the Lyceum.': '亚里士多德创立了吕刻昂学园。',
    'Socrates developed the Socratic method.': '苏格拉底发展了苏格拉底问答法。',
    'Plato developed the Theory of Forms.': '柏拉图发展了理型论。',
    'Aristotle developed the Golden Mean.': '亚里士多德发展了中庸之道。',
    'Aristotle formalized Logic.': '亚里士多德系统化了逻辑学。',
    'Hellenization spread Greek philosophy.': '希腊化传播了希腊哲学。',
    'Athens was the home of Greek Philosophy.': '雅典是希腊哲学的故乡。',
    'The Academy was located in Athens.': '学园位于雅典。',
    'The Lyceum was located in Athens.': '吕刻昂学园位于雅典。',
    'Hellenization carried Greek Philosophy to Alexandria.': '希腊化将希腊哲学带到了亚历山大城。',
    'Socrates lived in Athens.': '苏格拉底生活在雅典。',
    'Plato lived in Athens.': '柏拉图生活在雅典。',
    'Aristotle studied at the Academy.': '亚里士多德在学园学习。',
    'Aristotle left the Academy.': '亚里士多德离开了学园。',
    'Alexander conquered the Persian Empire.': '亚历山大征服了波斯帝国。',
    'The Ptolemies ruled Egypt after Alexander.': '托勒密王朝在亚历山大之后统治埃及。',
    'The Library of Alexandria was the largest in the ancient world.': '亚历山大图书馆是古代世界最大的图书馆。',
    'The Lighthouse of Alexandria was one of the Seven Wonders.': '亚历山大灯塔是七大奇迹之一。',
    "Alexander's conquests created the Hellenistic World.": '亚历山大的征服创造了希腊化世界。',
    'The Diadochi divided Alexander\'s empire.': '继业者瓜分了亚历山大的帝国。',
    'Hellenistic Culture blended Greek and Near Eastern traditions.': '希腊化文化融合了希腊与近东传统。',
    'Alexandria was the capital of Ptolemaic Egypt.': '亚历山大城是托勒密埃及的首都。',
    'The Library was in Alexandria.': '图书馆位于亚历山大城。',
    'The Lighthouse was in Alexandria.': '灯塔位于亚历山大城。',
    'Hellenistic Culture flourished in Alexandria.': '希腊化文化在亚历山大城繁荣。',
    'Alexander conquered the Persian Empire.': '亚历山大征服了波斯帝国。',
    'Hellenistic Culture influenced the Persian Empire.': '希腊化文化影响了波斯帝国。',
    'Cyrus founded the Achaemenid Empire.': '居鲁士创建了阿契美尼德帝国。',
    'The Achaemenid Empire was the largest empire yet seen.': '阿契美尼德帝国是当时最大的帝国。',
    'The Satrapy System administered the Achaemenid Empire.': '总督区体系管理着阿契美尼德帝国。',
    'Zoroastrianism was the religion of the Achaemenid Empire.': '琐罗亚斯德教是阿契美尼德帝国的宗教。',
    'Persepolis was the ceremonial capital of the Achaemenid Empire.': '波斯波利斯是阿契美尼德帝国的礼仪首都。',
    'Alexander conquered the Achaemenid Empire.': '亚历山大征服了阿契美尼德帝国。',
    'The Royal Road connected the Achaemenid Empire.': '御道连接了阿契美尼德帝国。',
    'Persepolis was built by Darius I.': '波斯波利斯由大流士一世建造。',
    'The Royal Road connected Persepolis to the empire.': '御道连接了波斯波利斯与帝国。',
    'Zoroastrianism was practiced at Persepolis.': '琐罗亚斯德教在波斯波利斯被信奉。',
    'Cyrus founded the Persian Empire.': '居鲁士创建了波斯帝国。',
    'Alexander conquered the Persian Empire.': '亚历山大征服了波斯帝国。',
    'Hellenistic Culture influenced the Persian Empire.': '希腊化文化影响了波斯帝国。',
    'Ashoka spread Buddhism after the Kalinga War.': '阿育王在羯陵伽战争后传播佛教。',
    'Chandragupta Maurya founded the Maurya Empire.': '旃陀罗笈多·孔雀创建了孔雀帝国。',
    'Ashoka ruled the Maurya Empire.': '阿育王统治孔雀帝国。',
    'Pataliputra was the Maurya capital.': '华氏城是孔雀王朝的都城。',
    'The Kalinga War led Ashoka to embrace Buddhism.': '羯陵伽战争使阿育王皈依佛教。',
    'Buddhism was founded by Siddhartha Gautama.': '佛教由悉达多·乔达摩创立。',
    'Buddhism spread across the Maurya Empire.': '佛教在孔雀帝国传播。',
    'Dharma was central to Ashoka\'s rule.': '正法是阿育王统治的核心。',
    'Buddhism spread from the Maurya Empire.': '佛教从孔雀帝国传播。',
    'The Kalinga War occurred in the Maurya Empire.': '羯陵伽战争发生在孔雀帝国。',
    'Pataliputra was in the Maurya Empire.': '华氏城在孔雀帝国。',
    'The Gupta Period followed the Maurya Empire.': '笈多时代接续孔雀帝国。',
    'Kalidasa lived during the Gupta Period.': '迦梨陀娑生活在笈多时代。',
    'The Zero and Decimal System was formalized in the Gupta Period.': '零与十进制系统在笈多时代正式形成。',
    'Aryabhata lived during the Gupta Period.': '阿利耶毗陀生活在笈多时代。',
    'Papyrus was made from plants along the Nile.': '纸莎草纸由尼罗河沿岸的植物制成。',
    'Hieroglyphs were written on papyrus.': '象形文字写在纸莎草纸上。',
    'The Pyramids were built as tombs for pharaohs.': '金字塔被建造为法老的陵墓。',
    'Aten was a sun-disk deity elevated by Akhenaten.': '阿吞是被阿肯那顿提升的太阳圆盘神祇。',
    'The Pharaoh ruled ancient Egypt.': '法老统治古埃及。',
    'Ma\'at was the concept of truth, balance, and order.': '玛亚特是真理、平衡与秩序的概念。',
    'Mummification preserved the dead for the afterlife.': '木乃伊制作保存死者以备来世。',
    'The Book of the Dead guided the deceased through the afterlife.': '亡灵书引导逝者穿越来世。',
    'The Nile sustained Egyptian civilization.': '尼罗河维系了埃及文明。',
    'Egyptian Religion centered on a pantheon of gods.': '埃及宗教以众神万神殿为中心。',
    'Papyrus grew along the Nile.': '纸莎草沿尼罗河生长。',
    'The Pyramids were built near the Nile.': '金字塔建在尼罗河附近。',
    'Egyptian Religion was practiced in the Nile Valley.': '埃及宗教在尼罗河谷被信奉。',
    'The Pharaoh ruled over the Nile Valley.': '法老统治尼罗河谷。',
}


def translate_entity_desc(desc):
    """Translate entity description if we have a match."""
    if not desc or not isinstance(desc, str):
        return desc
    # Check exact match
    if desc in DESC_TRANSLATIONS:
        return DESC_TRANSLATIONS[desc]
    # Check prefix match (for truncated descriptions)
    for key, val in DESC_TRANSLATIONS.items():
        if desc.startswith(key):
            return val + desc[len(key):]
    # If contains only ASCII and is longer than 10 chars, it's likely English
    if len(desc) > 10 and all(ord(c) < 128 for c in desc):
        print(f'  [MISSING] desc: {desc[:80]}')
    return desc


def translate_rel_desc(desc):
    if not desc or not isinstance(desc, str):
        return desc
    if desc in REL_TRANSLATIONS:
        return REL_TRANSLATIONS[desc]
    for key, val in REL_TRANSLATIONS.items():
        if desc.startswith(key):
            return val + desc[len(key):]
    return desc


def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    changed = False

    # Translate entities
    if 'entities' in data:
        for e in data['entities']:
            desc = e.get('description', '')
            translated = translate_entity_desc(desc)
            if translated != desc:
                e['description'] = translated
                changed = True

    # Translate relationships
    if 'relationships' in data:
        for r in data['relationships']:
            desc = r.get('description', '')
            translated = translate_rel_desc(desc)
            if translated != desc:
                r['description'] = translated
                changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    return False


def main():
    files = sorted([f for f in os.listdir(DATA_DIR) if f.endswith('.json')])
    for fn in files:
        topic = fn.replace('_example.json', '')
        if topic in SKIP_TOPICS:
            print(f'skip {fn} (already Chinese)')
            continue
        filepath = os.path.join(DATA_DIR, fn)
        print(f'processing {fn}...')
        if process_file(filepath):
            print(f'  translated')
        else:
            print(f'  no changes')

    print('\nDone!')

if __name__ == '__main__':
    main()
