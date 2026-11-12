import type { PreloadedBook } from '../domain/session';

const cover = (n: string) => `${import.meta.env.BASE_URL}club/${n}.jpg`;

/** Proposals collected by the club outside the app (portada i sinopsi del PDF del club). */
export const CLUB_PROPOSALS: PreloadedBook[] = [
  {
    proposer: 'Adrià',
    title: 'Confesiones',
    authors: ['Kanae Minato'],
    genre: 'Thriller',
    pages: 248,
    year: '2008',
    language: 'japonès',
    cover: cover('01'),
    description:
      'El último día de clase, la profesora Yuko Moriguchi anuncia a sus alumnos que deja la escuela. Todos saben el motivo: no han pasado más que unos días desde que su hija de cuatro años apareció ahogada en la piscina del colegio, en apariencia por accidente. Sin embargo, Yuko sabe que la verdad es muy distinta: la mataron dos alumnos de esa misma clase.\n\nY a ella no le interesa buscar justicia. En realidad, prefiere venganza. De esta última lección de Yuko nadie saldrá sin cicatrices; al fin y al cabo, todo el mundo tiene algo que confesar.',
  },
  {
    proposer: 'Adrià',
    title: 'El imperio del sol',
    authors: ['J. G. Ballard'],
    genre: 'Ficció històrica',
    pages: 400,
    year: '1984',
    language: 'anglès',
    cover: cover('02'),
    description:
      'Hijo de británicos acomodados residentes en el Asentamiento Internacional de Shanghai —un islote respetado dentro de la China ocupada por Japón—, Jim, niño de personalidad singular, escrutadora y analítica, recibe un mazazo inesperado cuando, de resultas del ataque a Pearl Harbor y la entrada de Japón en la Segunda Guerra Mundial, los japoneses irrumpen en la ciudad y se ve separado de sus padres y arrojado a buscarse la vida por sus propios medios. Recluido finalmente en el campo de prisioneros de Lunghua en la edad decisiva del paso de la infancia a la adolescencia, se adaptará con extrema e instintiva lucidez a este nuevo y reducido mundo para el cual rigen otras reglas y que pasará a convertirse para él, paradójicamente, en una suerte de «segundo hogar».',
  },
  {
    proposer: 'Martí',
    title: 'Tokio blues',
    authors: ['Haruki Murakami'],
    genre: 'Ficció, literatura japonesa',
    pages: 392,
    year: '1987',
    language: 'japonès',
    cover: cover('03'),
    description:
      'Mientras aterriza en un aeropuerto europeo, Toru Watanabe, un ejecutivo de 37 años, escucha una vieja canción de los Beatles que le hace retroceder a su juventud, al turbulento Tokio de los años sesenta. Con una mezcla de melancolía y desasosiego, Toru recuerda entonces a la inestable y misteriosa Naoko, la novia de su mejor y único amigo de la adolescencia, Kizuki. El suicidio de este distanció a Toru y a Naoko durante un año, hasta que se reencontraron e iniciaron una relación íntima. Sin embargo, la aparición de otra mujer en la vida de Toru le lleva a experimentar el deslumbramiento y el desengaño allí donde todo debería cobrar sentido: el sexo, el amor y la muerte. Y ninguno de los personajes parece capaz de alcanzar el frágil equilibrio entre las esperanzas juveniles y la necesidad de encontrar un lugar en el mundo.',
  },
  {
    proposer: 'Martí',
    title: 'El extranjero',
    authors: ['Albert Camus'],
    genre: 'Clàssic',
    pages: 128,
    year: '1942',
    language: 'francès',
    cover: cover('04'),
    description:
      'Este libro capital para la cultura del siglo XX transcurre en Argelia y narra la anodina vida de Meursault, un joven oficinista que vive en perpetua apatía. Cuando recibe la noticia del fallecimiento de su madre, la encaja con la mayor impasibilidad. Obligado a abandonar la capital y viajar para asistir al funeral, Meursault desea que la ceremonia sea breve para regresar a su casa. Esa indiferencia existencial marca sus días, avanzando sin reaccionar a la muerte de su madre, al afecto de su amada y ni tan siquiera a un crimen que cometerá con idéntica desidia, incapaz de ver el alcance moral de sus actos.\n\nCamus retrata magistralmente la indolencia del hombre del siglo XX, un hombre que no encuentra su lugar, extranjero en su propio mundo. Este personaje escéptico y desapasionado que ha abandonado su condición de sujeto autónomo sigue siendo hoy un imprescindible referente literario y existencial.',
  },
  {
    proposer: 'Albert',
    title: 'Entre dos fuegos',
    authors: ['Christopher Buehlman'],
    genre: 'Fantasia i terror',
    pages: 432,
    year: '2012',
    language: 'anglès',
    cover: cover('05'),
    description:
      'Año 1348. Thomas, un caballero caído en desgracia, encuentra a una niña sola en un pueblo normando arrasado. Huérfana de la peste negra, Delphine le cuenta a Thomas que la peste es solo parte de un cataclismo mayor: los ángeles caídos, con Lucifer al frente, se están levantando en una segunda guerra contra el cielo y el mundo de los hombres está atrapado en el conflicto. ¿Es delirio o es fe?\n\nLa niña cree que ve a los ángeles de Dios y que los muertos le hablan en sueños. Así, convence a Thomas para que la escolte a través de un paisaje desolado hasta Aviñón, donde Delphine intentará enfrentarse al mal que ha devastado la tierra y devolver a Thomas la esperanza de salvación.\n\nMientras el infierno desata su ira y se revela la verdadera naturaleza de la muchacha, Thomas transitará por un macabro campo de batalla de ángeles y demonios, santos y muertos resucitados, en medio de una lucha desesperada por el alma del ser humano.',
  },
  {
    proposer: 'Albert',
    title: 'Ese no es mi nombre',
    authors: ['Megan Lally'],
    genre: 'Thriller',
    pages: 368,
    year: '2023',
    language: 'anglès',
    cover: cover('06'),
    description:
      'Ella pensaba que había recuperado su vida. Pero se equivocaba. Nunca debió haber confiado en él.\n\nTemblando de frío y magullada, una adolescente se despierta en la cuneta sin recuerdo alguno de cómo ha llegado hasta ahí… o de quién es. Un agente la lleva a la comisaría más cercana, y allí se encuentran con un hombre que lleva horas buscándola. Es su padre, y ella se llama Mary. O eso dice él.\n\nCuando Lola desaparece tras una discusión con su novio Drew, el pueblo entero está convencido de que este la mató. Más allá de demostrar su inocencia, Drew necesita encontrar a Lola antes de que sea demasiado tarde. Cuanto más tiempo pase desde su desaparición, menos pistas que seguir hay… y más peligro para ambos.',
  },
  {
    proposer: 'Gemma',
    title: 'El baile de las locas',
    authors: ['Victoria Mas'],
    genre: 'Ficció històrica',
    pages: 240,
    year: '2019',
    language: 'francès',
    cover: cover('07'),
    description:
      'Un homenaje al valor de las mujeres.\n\nEstamos en París en marzo de 1885. Como cada año para la Media Cuaresma, se celebra el popular «baile de las locas» en el hospital de la Salpêtrière, dirigido por el eminente neurólogo profesor Charcot. Durante una noche, la flor y nata de París disfruta al ritmo de valses y polcas en compañía de las internas, disfrazadas con extravagantes atuendos. Entre las pacientes destacan Louise, una joven epiléptica maltratada por su tío que tiene puestas todas sus ilusiones en un futuro matrimonio con un interno del centro, y la rebelde y visionaria Eugénie, una muchacha de buena familia encerrada sin contemplaciones por su propio padre. Bajo la atenta vigilancia de la implacable supervisora Geneviève, ambas intentarán cumplir sus sueños y harán todo lo posible por escapar.',
  },
  {
    proposer: 'Ruth',
    title: 'La chica del tren',
    authors: ['Paula Hawkins'],
    genre: 'Thriller',
    pages: 496,
    year: '2015',
    language: 'anglès',
    cover: cover('08'),
    description:
      '¿Estabas en el tren de las 8.04? ¿Viste algo sospechoso? Tú no la conoces. Ella a ti, sí.\n\nRachel toma siempre el tren de las 8.04 h. Cada mañana lo mismo: el mismo paisaje, las mismas casas… y la misma parada en la señal roja. Son solo unos segundos, pero le permiten observar a una pareja desayunando tranquilamente en su terraza. Siente que los conoce y se inventa unos nombres para ellos: Jess y Jason. Su vida es perfecta, no como la suya. Pero un día ve algo. Sucede muy deprisa, pero es suficiente. ¿Y si Jess y Jason no son tan felices como ella cree? ¿Y si nada es lo que parece?',
  },
  {
    proposer: 'Ruth',
    title: 'El misterio de la lavandería de Yeonnam-dong',
    authors: ['Kim Jiyun'],
    genre: 'Ficció coreana',
    pages: 320,
    year: '2023',
    language: 'coreà',
    cover: cover('09'),
    description:
      'En la frenética Seúl hay una pequeña lavandería donde el tiempo parece detenerse y se alivian las soledades de sus vecinos.\n\nEn el corazón de Yeonnam-dong, un vibrante barrio de Seúl, una pequeña lavandería ofrece algo que no tiene precio: entre luces cálidas y el reconfortante aroma a café y ropa recién lavada, los vecinos encuentran un remanso de paz a cualquier hora del día. Una mañana, un cliente olvida allí un diario y sus páginas empiezan a llenarse de confesiones, miedos y sueños anónimos. Desconocidos que antes solo se cruzaban comienzan a entrelazar sus propias historias y a compartir apoyo y consuelo. Pero un día, el diario saca a la luz un relato más oscuro. A partir de ahí, los habituales de la lavandería deberán desentrañar el misterio para proteger la armonía de la comunidad que, sin darse cuenta, han construido juntos.',
  },
  {
    proposer: 'Gràcia',
    title: 'El club del crim dels dijous',
    authors: ['Richard Osman'],
    genre: 'Misteri',
    pages: 448,
    year: '2020',
    language: 'anglès',
    cover: cover('10'),
    description:
      'En un pacífic complex privat per a jubilats, quatre improbables amics es reuneixen un cop a la setmana per revisar antics casos d’assassinats locals que van quedar sense resoldre. Ells són en Ron, un exactivista socialista ple de tatuatges i revolució; la dolça Joyce, una vídua que no és tan ingènua com aparenta; l’Ibrahim, un antic psiquiatre amb una capacitat d’anàlisi increïble, i la tremenda i enigmàtica Elizabeth, que, amb vuitanta-un anys, lidera el grup d’investigadors aficionats… o no tant.\n\nQuan un promotor immobiliari de la zona apareix mort amb una misteriosa fotografia al costat del cos, El Club del Crim dels Dijous es troba enmig del seu primer cas real. Encara que siguin octogenaris, els quatre amics guarden alguns trucs a la màniga. Podrà atrapar l’assassí aquest grup poc ortodox però brillant?',
  },
  {
    proposer: 'Aleix',
    title: 'Un mundo feliz',
    authors: ['Aldous Huxley'],
    genre: 'Ciència-ficció, clàssic',
    pages: 256,
    year: '1932',
    language: 'anglès',
    cover: cover('11'),
    description:
      'Los peores vaticinios del capitalismo se han cumplido: triunfan los dioses del consumo y la comodidad, y el orbe se divide en diez zonas en apariencia seguras y estables. Los humanos ya no procrean, el sexo se ha convertido solo en una diversión y las letras del alfabeto griego se han pervertido para clasificar a los seres humanos por castas. Todos aceptan su lugar en la nueva jerarquía social, perfectamente ordenada.\n\nLos valores humanos esenciales no tienen cabida en este mundo y los habitantes se crean in vitro con una técnica concebida a imagen y semejanza de una cadena de montaje. El soma, la droga por excelencia en este mundo distópico que propone Huxley, ayuda a los habitantes a escapar de la rutina. A cambio de este orden pulcro, la libertad de expresión y el pensamiento crítico han sido erradicados. Bernard Marx, el protagonista de la novela, inconformista e inteligente, deberá probar los límites de la sociedad que lo ha engendrado, iniciando un viaje más allá de las fronteras distópicas de su universo.',
  },
];

/** Unique proposer names, in order of appearance. */
export const CLUB_MEMBERS = [...new Set(CLUB_PROPOSALS.map((b) => b.proposer))];
